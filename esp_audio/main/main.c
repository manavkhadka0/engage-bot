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
 * Standalone hardware-loop test build — PIR-triggered, no WiFi/MQTT/backend.
 * Ported from a bench-tested Arduino sketch (FastLED + ESP32-audioI2S) to
 * this project's real ESP-IDF firmware, per the project's own convention of
 * prototyping new subsystems in Arduino IDE and porting confirmed logic in
 * (see INTERN_FIRMWARE_TASKS.md §0). Deliberately does NOT wire up
 * wifi_manager/downloader/mqtt_ctl — those components are untouched and
 * still here for the follow-up step once a backend is hosted; this build
 * just proves the physical loop: PIR -> audio+motor+LED -> reed switch ->
 * home -> repeat.
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

#define PIR_PIN          GPIO_NUM_34   /* input-only, no internal pull */
#define REED_SWITCH_PIN  GPIO_NUM_18   /* INPUT_PULLUP; LOW = magnet present (home) */

/* Raw flash partition holding the default clip. Flash techno.wav onto it
 * with parttool before running this build — see README.md. */
#define AUDIO_PART_LABEL "audio"

/* PIR confirmation: this many consecutive HIGH reads before triggering. */
#define REQUIRED_READS   3
#define POLL_MS          10

/* Home-timeout/FAULT removed for now, at the user's request, while bringing
 * up the motor driver (AO1/AO2 reading no voltage — VM likely not powered).
 * RETURNING_HOME now just waits indefinitely for the reed switch, matching
 * the original Arduino reference's actual (unenforced) behavior. This is a
 * real safety gap to bring back once the driver is confirmed working: a
 * broken/misplaced reed switch will otherwise spin the motor forever. See
 * ELECTRONICS_ARCHITECTURE.md's risk register ("Missed/bounced limit
 * switch"). */


typedef enum
{
    STATE_WAITING_FOR_PERSON,
    STATE_AUDIO_AND_MOVEMENT,
    STATE_RETURNING_HOME,
    STATE_HOME_REACHED,
} app_state_t;


/* aud_player_play_partition() blocks its caller until the whole clip has
 * played (see aud_player.c) — there's no non-blocking "isRunning" API like
 * the Arduino Audio library had. Run it on its own task and use this flag
 * as the isRunning() equivalent, so the state machine can keep animating
 * LEDs and polling the reed switch while playback is in flight. Single
 * writer per direction (audio_task only ever sets it false; state_machine_
 * task only ever sets it true, and only from a state where it's already
 * false) — no mutex needed for that access pattern. */
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
    const esp_partition_t *part = audio_partition();
    app_state_t state        = STATE_WAITING_FOR_PERSON;
    int         high_counter = 0;

    while (1)
    {
        switch (state)
        {
        case STATE_WAITING_FOR_PERSON:
        {
            high_counter = gpio_get_level(PIR_PIN) ? high_counter + 1 : 0;

            if (high_counter >= REQUIRED_READS)
            {
                high_counter = 0;
                ESP_LOGI(TAG, ">>> PERSON DETECTED <<<");

                if (part == NULL || !start_audio(part))
                {
                    ESP_LOGE(TAG, "Could not start audio — staying in WAITING_FOR_PERSON");
                    break;
                }

                motor_driver_forward();
                ESP_LOGI(TAG, "Audio + motor active. Reed switch ignored until audio finishes.");
                state = STATE_AUDIO_AND_MOVEMENT;
            }
            break;
        }

        case STATE_AUDIO_AND_MOVEMENT:
        {
            /* Reed switch is deliberately NOT read here, same as the
             * reference sketch: even if the magnet is already at GPIO18,
             * the motor keeps running and the clip keeps playing — "home"
             * only means something once the audio has actually finished. */
            led_fx_red_white();

            if (!s_audio_playing)
            {
                ESP_LOGI(TAG, "Audio finished. Motor continues FORWARD. Reed switch now active.");
                led_fx_green();
                state = STATE_RETURNING_HOME;
            }
            break;
        }

        case STATE_RETURNING_HOME:
        {
            led_fx_green();

            /* No timeout for now — waits indefinitely for the reed switch.
             * See the comment above app_state_t for why. */
            if (gpio_get_level(REED_SWITCH_PIN) == 0)   /* LOW = magnet present */
            {
                ESP_LOGI(TAG, ">>> MAGNET DETECTED — HOME POSITION <<<");
                motor_driver_stop();
                led_fx_off();
                state = STATE_HOME_REACHED;
            }
            break;
        }

        case STATE_HOME_REACHED:
        {
            motor_driver_stop();
            led_fx_off();
            high_counter = 0;

            ESP_LOGI(TAG, "System ready. Waiting for person...");
            state = STATE_WAITING_FOR_PERSON;
            vTaskDelay(pdMS_TO_TICKS(500));
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
    ESP_LOGI(TAG, "Ready. Waiting for person...");

    xTaskCreate(state_machine_task, "state_machine", 4096, NULL, 5, NULL);
}
