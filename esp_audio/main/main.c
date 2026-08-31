#include <stdio.h>
#include <stdbool.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_err.h"
#include "esp_log.h"
#include "esp_partition.h"
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
 *   3. RUNNING: motor starts, the clip plays ONCE (no looping), LEDs
 *      animate. Motion and the reed switch are both deliberately NOT read
 *      here — once triggered, the cycle runs to completion regardless of
 *      whether the person stays or leaves.
 *   4. WAITING_FOR_REED: audio has finished: the motor keeps spinning
 *      forward (it never reverses) and the reed switch becomes active for
 *      the first time. It trips once per revolution at the mechanism's
 *      home position.
 *   5. RESTING: reed switch tripped, motor stopped. A fixed REST_TIME_MS
 *      timer runs (motion ignored) before re-arming to READY.
 *
 * Audio storage stays on the raw `audio` flash partition via
 * aud_player_play_partition() (flash techno.wav onto it with parttool —
 * see README.md) rather than switching to the Arduino reference's
 * LittleFS+named-file approach — same audible result, and this path is
 * already proven on real hardware.
 *
 * aud_player_request_stop() (added for the previous continuous-presence
 * iteration) is unused by this flow — a cycle is never cut short once
 * started — but is left in aud_player.c/.h as a harmless, still-correct
 * capability rather than backed out for no functional benefit.
 *
 * The old touch-button (GPIO4 download / GPIO12 play) flow from the
 * networked build is gone in this variant, not just unused — that's what
 * frees GPIO4 for the WS2812 LED data line below. Don't add touch_pad_*
 * calls back into this file without also moving the LED off GPIO4; the
 * capacitive touch peripheral and a bit-banged LED protocol on the same pin
 * will corrupt both.
 *
 * Pin map here matches the bench-tested Arduino reference, not
 * ELECTRONICS_ARCHITECTURE.md's earlier "STBY tied high via a resistor"
 * plan — STBY is GPIO-driven here (see motor_driver.c). That doc still
 * needs updating to match this; ask before assuming either one is final.
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

/* Fixed rest after the reed switch stops the motor, before re-arming.
 * Motion is ignored during this window, same as the reference sketch. */
#define REST_TIME_MS  7000

/* No home-timeout/FAULT for now, at the user's request, while bringing up
 * the motor driver (AO1/AO2 reading no voltage — VM likely not powered).
 * STATE_WAITING_FOR_REED below waits indefinitely for the reed switch.
 * This is a real safety gap to bring back once the driver is confirmed
 * working: a broken/misplaced reed switch will otherwise spin the motor
 * forever. See ELECTRONICS_ARCHITECTURE.md's risk register ("Missed/
 * bounced limit switch"). */


typedef enum
{
    STATE_READY,             /* idle, waiting for motion */
    STATE_CONFIRMING,        /* motion seen, waiting out CONFIRM_TIME_MS */
    STATE_RUNNING,           /* motor + audio committed, single pass, reed ignored */
    STATE_WAITING_FOR_REED,  /* audio done, motor still spinning, reed now active */
    STATE_RESTING,           /* stopped, fixed REST_TIME_MS timer before re-arming */
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

static void audio_task(void *arg)
{
    const esp_partition_t *part = (const esp_partition_t *)arg;

    esp_err_t err = aud_player_play_partition(part);
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
        ESP_LOGW(TAG, "start_audio called while already playing — ignoring");
        return false;
    }

    s_audio_playing = true;

    if (xTaskCreate(audio_task, "audio", 8192, (void *)part, 5, NULL) != pdPASS)
    {
        s_audio_playing = false;
        ESP_LOGE(TAG, "Failed to create audio task");
        return false;
    }
    return true;
}


static void pir_reed_init(void)
{
    gpio_config_t pir_conf = {
        .pin_bit_mask = 1ULL << PIR_PIN,
        .mode         = GPIO_MODE_INPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&pir_conf));

    /* GPIO18 has a normal internal pull-up (unlike the input-only 34-39
     * range) — INPUT_PULLUP costs nothing extra in hardware. */
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
    const esp_partition_t *part          = audio_partition();
    app_state_t             state        = STATE_READY;
    TickType_t              confirm_start = 0;
    TickType_t              rest_start    = 0;

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

                motor_driver_forward();
                ESP_LOGI(TAG, "Motor + audio active. Reed switch ignored until audio finishes.");
                state = STATE_RUNNING;
            }
            break;
        }

        case STATE_RUNNING:
        {
            /* Motion and the reed switch are deliberately NOT read here —
             * once triggered, this cycle runs to completion regardless of
             * whether the person stays or leaves. */
            led_fx_red_white();

            if (!s_audio_playing)
            {
                ESP_LOGI(TAG, "Audio finished. Motor continues. Reed switch now active.");
                led_fx_green();
                state = STATE_WAITING_FOR_REED;
            }
            break;
        }

        case STATE_WAITING_FOR_REED:
        {
            led_fx_green();

            /* No timeout for now — waits indefinitely for the reed switch.
             * See the comment above app_state_t for why. */
            if (gpio_get_level(REED_SWITCH_PIN) == 0)   /* LOW = magnet present */
            {
                ESP_LOGI(TAG, ">>> REED SWITCH DETECTED — MOTOR STOPPED <<<");
                motor_driver_stop();
                led_fx_off();
                rest_start = xTaskGetTickCount();
                ESP_LOGI(TAG, "Resting for %d ms.", REST_TIME_MS);
                state = STATE_RESTING;
            }
            break;
        }

        case STATE_RESTING:
        {
            /* Motion is ignored here, same as the reference sketch — the
             * rest period is unconditional. */
            motor_driver_stop();
            led_fx_off();

            if ((xTaskGetTickCount() - rest_start) >= pdMS_TO_TICKS(REST_TIME_MS))
            {
                ESP_LOGI(TAG, "Rest complete. Ready to scan.");
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
    }
    else
    {
        ESP_LOGW(TAG, "No 'audio' partition found — flash techno.wav onto it "
                      "first (see README.md's standalone test section).");
    }

    pir_reed_init();
    ESP_ERROR_CHECK(motor_driver_init());
    ESP_ERROR_CHECK(led_fx_init());
    led_fx_off();

    ESP_LOGI(TAG, "PIR=GPIO%d  Reed=GPIO%d", PIR_PIN, REED_SWITCH_PIN);
    ESP_LOGI(TAG, "Ready to scan.");

    xTaskCreate(state_machine_task, "state_machine", 4096, NULL, 5, NULL);
}
