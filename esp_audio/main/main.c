#include <stdio.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_err.h"
#include "esp_log.h"
#include "esp_partition.h"
#include "esp_random.h"
#include "driver/gpio.h"

#include "aud_player.h"
#include "motor_driver.h"
#include "led_fx.h"

/*
 * Standalone hardware-loop test build — mmWave-triggered, no
 * WiFi/MQTT/backend. Ported from a bench-tested Arduino sketch
 * (LittleFS + ESP8266Audio-style WAV playback) to this project's real
 * ESP-IDF firmware, per the project's own convention of prototyping new
 * subsystems in Arduino IDE and porting confirmed logic in (see
 * INTERN_FIRMWARE_TASKS.md §0). Deliberately does NOT wire up
 * wifi_manager/downloader/mqtt_ctl — those components are untouched and
 * still here for the follow-up step once a backend is hosted.
 *
 * Flow — single committed cycle per trigger, not a continuous-presence
 * loop (that was an earlier iteration of this file; this supersedes it):
 *   1. READY: idle. Motor stopped, nothing plays, until motion.
 *   2. CONFIRMING: motion must read present continuously for
 *      CONFIRM_TIME_MS before it counts — any LOW read during this window
 *      cancels back to READY. This is a debounce, not a "how long the
 *      cycle runs" setting.
 *   3. RUNNING: a random clip plays ONCE. Motor starts after
 *      MOTOR_START_DELAY_MS and keeps running. Reed is ignored until
 *      audio has finished, then the first trip homes the motor.
 *      No 20 s motor timer.
 *   4. RESTING: reed tripped, motor stopped. REST_TIME_MS (250 ms) then
 *      the mmWave is armed again.
 *
 * Audio storage stays on the raw `audio` flash partition via
 * aud_player_play_partition() (flash techno.wav onto it with parttool —
 * see README.md) rather than switching to the Arduino reference's
 * LittleFS+named-file approach — same audible result, and this path is
 * already proven on real hardware.
 *
 * aud_player_request_stop() is unused by this flow — a cycle is never
 * cut short once started — but is left in aud_player.c/.h.
 *
 * The old touch-button (GPIO4 download / GPIO12 play) flow from the
 * networked build is gone in this variant, not just unused — that's what
 * frees GPIO4 for the WS2812 LED data line below. Don't add touch_pad_*
 * calls back into this file without also moving the LED off GPIO4; the
 * capacitive touch peripheral and a bit-banged LED protocol on the same pin
 * will corrupt both.
 *
 * Motor is a single GPIO14 line through an optocoupler (galvanic
 * isolation): LOW = run, HIGH = stop. AIN1/AIN2/STBY (GPIO13/23/19) and
 * PWM are unused. Reed-switch home detect becomes active only after the
 * clip has finished, with a short leave-home window so the magnet still
 * at start does not immediately stop the motor.
 *
 * Board history: FireBeetle 2 ESP32-UE (N16R2) -> that unit failed -> an
 * ESP32-S3-N16R8 (briefly, needed a different pin map and target for the
 * S3's reserved flash/PSRAM range, native-USB pins, and a few GPIO numbers
 * that don't exist on that chip at all) -> back to a FireBeetle 2 ESP32-UE
 * (a new unit) now that a replacement is in hand. Target is esp32
 * (idf.py set-target) and every pin below is back to the FireBeetle map.
 */

#define TAG "MAIN"

#define PIR_PIN          GPIO_NUM_34   /* mmWave presence output, input-only pin, no internal pull */
#define REED_SWITCH_PIN  GPIO_NUM_18   /* INPUT_PULLUP; LOW = magnet present (home) */

/* Raw flash partition holding the default clip. Flash techno.wav onto it
 * with parttool before running this build — see README.md. */
#define AUDIO_PART_LABEL "audio"

#define POLL_MS  10

/* Motion must read present continuously this long before a cycle starts. */
#define CONFIRM_TIME_MS  1000

/* After the reed stops the motor, mmWave is armed again this quickly. */
#define REST_TIME_MS  250

/* Let I2S DMA fill before the motor inrush hits. */
#define MOTOR_START_DELAY_MS  1000

/* Ignore the reed until the magnet has left home, otherwise the motor
 * would stop on the same trip that was still LOW at start. */
#define REED_LEAVE_HOME_MS    400

#define AUDIO_TASK_PRIO       8
#define STATE_MACHINE_PRIO    5

/* WS2812 refresh is RMT-heavy; don't do it every 10 ms during playback. */
#define LED_ANIM_PERIOD_MS    80

#define AUDIO_PACK_MAGIC      0x324E4B54u   /* 'TKN2' */

#define AUDIO_PACK_MAX_CLIPS  2

/* No home-timeout/FAULT for now, at the user's request. STATE_RUNNING
 * waits indefinitely for the reed switch once the motor is spinning.
 * A broken/misplaced reed will otherwise spin the motor forever. */


typedef enum
{
    STATE_READY,             /* idle, waiting for motion */
    STATE_CONFIRMING,        /* motion seen, waiting out CONFIRM_TIME_MS */
    STATE_RUNNING,           /* clip + motor; reed homes only after audio ends */
    STATE_RESTING,           /* motor stopped; REST_TIME_MS then mmWave is live */
} app_state_t;


/* aud_player_play_partition() blocks its caller until the whole clip has
 * played (see aud_player.c) — there's no non-blocking "isRunning" API like
 * the Arduino Audio library had. Run it on its own task and use this flag
 * as the isRunning() equivalent, so the state machine can keep animating
 * LEDs while playback is in flight. Single writer per direction (audio_task
 * only ever sets it false; state_machine_task only ever sets it true, and
 * only from a state where it's already false) — no mutex needed for that
 * access pattern. */
static volatile bool s_audio_playing = false;

typedef struct __attribute__((packed))
{
    uint32_t magic;
    uint32_t count;
    uint32_t offset[AUDIO_PACK_MAX_CLIPS];
    uint32_t size[AUDIO_PACK_MAX_CLIPS];
} audio_pack_hdr_t;

typedef struct
{
    const esp_partition_t *part;
    size_t                 offset;
    size_t                 size;
} audio_job_t;

static audio_job_t     s_audio_job;
static audio_pack_hdr_t s_pack;
static bool            s_pack_ok = false;


static const esp_partition_t *audio_partition(void)
{
    const esp_partition_t *p = esp_partition_find_first(
        ESP_PARTITION_TYPE_DATA, ESP_PARTITION_SUBTYPE_ANY, AUDIO_PART_LABEL);

    if (p == NULL)
    {
        ESP_LOGE(TAG, "Partition '%s' not found", AUDIO_PART_LABEL);
    }
    return p;
}

static bool load_audio_pack(const esp_partition_t *part)
{
    s_pack_ok = false;
    if (part == NULL)
    {
        return false;
    }

    if (esp_partition_read(part, 0, &s_pack, sizeof(s_pack)) != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to read audio pack header");
        return false;
    }

    if (s_pack.magic != AUDIO_PACK_MAGIC ||
        s_pack.count == 0 ||
        s_pack.count > AUDIO_PACK_MAX_CLIPS)
    {
        ESP_LOGW(TAG, "No TKN2 pack (magic=0x%08x count=%u) — single-clip fallback",
                 (unsigned)s_pack.magic, (unsigned)s_pack.count);
        return false;
    }

    for (uint32_t i = 0; i < s_pack.count; i++)
    {
        if (s_pack.size[i] == 0 ||
            s_pack.offset[i] + s_pack.size[i] > part->size)
        {
            ESP_LOGE(TAG, "Clip %u out of range off=%u size=%u",
                     (unsigned)i, (unsigned)s_pack.offset[i],
                     (unsigned)s_pack.size[i]);
            return false;
        }
    }

    s_pack_ok = true;
    ESP_LOGI(TAG, "Audio pack: %u clips", (unsigned)s_pack.count);
    return true;
}

static void audio_task(void *arg)
{
    audio_job_t *job = (audio_job_t *)arg;

    esp_err_t err = aud_player_play_partition_range(job->part, job->offset, job->size);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Playback error: %s", esp_err_to_name(err));
    }

    s_audio_playing = false;
    vTaskDelete(NULL);
}

/* Returns false if a playback task couldn't be started (already playing, or
 * task creation failed) — caller should not proceed into the
 * audio-in-flight state in that case. */
static bool start_audio(const esp_partition_t *part)
{
    if (s_audio_playing)
    {
        ESP_LOGI(TAG, "Stopping leftover clip before new engage");
        aud_player_request_stop();
        for (int i = 0; i < 50 && s_audio_playing; i++)
        {
            vTaskDelay(pdMS_TO_TICKS(10));
        }
        if (s_audio_playing)
        {
            ESP_LOGW(TAG, "start_audio: previous clip still playing — ignoring");
            return false;
        }
    }

    s_audio_job.part = part;
    if (s_pack_ok)
    {
        uint32_t n = s_pack.count;
        uint32_t i = (n == 1) ? 0 : (esp_random() % n);
        s_audio_job.offset = s_pack.offset[i];
        s_audio_job.size   = s_pack.size[i];
        ESP_LOGI(TAG, "Engage: playing clip %u / %u", (unsigned)i + 1, (unsigned)n);
    }
    else
    {
        s_audio_job.offset = 0;
        s_audio_job.size   = part->size;
        ESP_LOGI(TAG, "Engage: playing single clip");
    }

    s_audio_playing = true;

    if (xTaskCreate(audio_task, "audio", 8192, &s_audio_job, AUDIO_TASK_PRIO, NULL) != pdPASS)
    {
        s_audio_playing = false;
        ESP_LOGE(TAG, "Failed to create audio task");
        return false;
    }
    return true;
}


static void pir_reed_init(void)
{
    /* No internal pull needed — the mmWave module drives this pin
     * push-pull on its own (not open-drain), so it never floats. */
    gpio_config_t pir_conf = {
        .pin_bit_mask = 1ULL << PIR_PIN,
        .mode         = GPIO_MODE_INPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&pir_conf));

    /* Reed switch is a simple mechanical contact to GND — needs a pull
     * itself, so INPUT_PULLUP does that in hardware for free. */
    gpio_config_t reed_conf = {
        .pin_bit_mask = 1ULL << REED_SWITCH_PIN,
        .mode         = GPIO_MODE_INPUT,
        .pull_up_en   = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&reed_conf));
}


static void state_machine_task(void *arg)
{
    const esp_partition_t *part           = audio_partition();
    app_state_t             state         = STATE_READY;
    TickType_t              confirm_start = 0;
    TickType_t              rest_start    = 0;
    TickType_t              running_start = 0;
    TickType_t              motor_start   = 0;
    TickType_t              last_led      = 0;
    bool                    motor_started = false;

    while (1)
    {
        switch (state)
        {
        case STATE_READY:
        {
            if (gpio_get_level(PIR_PIN))
            {
                ESP_LOGI(TAG, ">>> MOTION DETECTED <<<");
                confirm_start = xTaskGetTickCount();
                state = STATE_CONFIRMING;
            }
            break;
        }

        case STATE_CONFIRMING:
        {
            if (!gpio_get_level(PIR_PIN))
            {
                ESP_LOGI(TAG, "Motion lost during confirm — back to READY.");
                state = STATE_READY;
                break;
            }

            if ((xTaskGetTickCount() - confirm_start) >= pdMS_TO_TICKS(CONFIRM_TIME_MS))
            {
                ESP_LOGI(TAG, ">>> PERSON CONFIRMED — cycle starting <<<");

                if (part == NULL || !start_audio(part))
                {
                    ESP_LOGE(TAG, "Audio failed to start — back to READY.");
                    state = STATE_READY;
                    break;
                }

                running_start = xTaskGetTickCount();
                last_led      = running_start;
                motor_started = false;
                motor_start   = 0;
                ESP_LOGI(TAG, "Engage. Motor in %d ms; reed homes after audio.",
                         MOTOR_START_DELAY_MS);
                state = STATE_RUNNING;
            }
            break;
        }

        case STATE_RUNNING:
        {
            /* Motor runs through the clip. Reed is ignored until audio
             * has stopped, then a short leave-home window, then reed wins. */
            TickType_t now = xTaskGetTickCount();

            if (!motor_started &&
                (now - running_start) >= pdMS_TO_TICKS(MOTOR_START_DELAY_MS))
            {
                motor_driver_forward();
                motor_started = true;
                motor_start   = now;
                ESP_LOGI(TAG, "Motor running (GPIO14 LOW). Reed waits for audio end.");
            }

            if ((now - last_led) >= pdMS_TO_TICKS(LED_ANIM_PERIOD_MS))
            {
                led_fx_red_white();
                last_led = now;
            }

            if (!s_audio_playing &&
                motor_started &&
                (now - motor_start) >= pdMS_TO_TICKS(REED_LEAVE_HOME_MS) &&
                gpio_get_level(REED_SWITCH_PIN) == 0)
            {
                ESP_LOGI(TAG, ">>> REED SWITCH DETECTED — MOTOR STOPPED <<<");
                motor_driver_stop();
                led_fx_off();
                rest_start = xTaskGetTickCount();
                ESP_LOGI(TAG, "mmWave rearms in %d ms.", REST_TIME_MS);
                state = STATE_RESTING;
            }
            break;
        }

        case STATE_RESTING:
        {
            motor_driver_stop();
            led_fx_off();

            if ((xTaskGetTickCount() - rest_start) >= pdMS_TO_TICKS(REST_TIME_MS))
            {
                ESP_LOGI(TAG, "Ready to scan.");
                state = STATE_READY;
            }
            break;
        }
        }

        vTaskDelay(pdMS_TO_TICKS(POLL_MS));
    }
}


void app_main(void)
{
    printf("\n");
    printf("==========================================\n");
    printf(" TOKINOMO — standalone hardware loop test\n");
    printf(" (no WiFi / MQTT / backend in this build)\n");
    printf("==========================================\n");

    const esp_partition_t *part = audio_partition();
    if (part != NULL)
    {
        ESP_LOGI(TAG, "audio partition: %u bytes @ 0x%06x",
                 (unsigned)part->size, (unsigned)part->address);
        load_audio_pack(part);
    }
    else
    {
        ESP_LOGW(TAG, "No 'audio' partition found — flash the TKN2 clip pack "
                      "onto it (see tools/pack_audio_clips.py).");
    }

    pir_reed_init();
    ESP_ERROR_CHECK(motor_driver_init());
    ESP_ERROR_CHECK(led_fx_init());
    led_fx_off();

    ESP_LOGI(TAG, "PIR=GPIO%d  Reed=GPIO%d", PIR_PIN, REED_SWITCH_PIN);
    ESP_LOGI(TAG, "Ready to scan.");

    xTaskCreate(state_machine_task, "state_machine", 4096, NULL, STATE_MACHINE_PRIO, NULL);
}
