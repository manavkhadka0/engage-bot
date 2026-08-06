#include <stdio.h>
#include <stdbool.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"

#include "esp_err.h"
#include "esp_log.h"
#include "esp_partition.h"

#include "driver/touch_sensor.h"

#include "wifi_manager.h"
#include "downloader.h"
#include "aud_player.h"
#include "mqtt_ctl.h"


#define TAG "MAIN"


/* ---- Wi-Fi ------------------------------------------------------------ */
#define WIFI_SSID       "your-ssid"
#define WIFI_PASSWORD   "***REMOVED***"

/* Manual-testing fallback clip for the D4 touch pad (bypasses the backend
 * entirely, useful for bench testing without WiFi/MQTT working). */
#define WAV_URL         "https://raw.githubusercontent.com/manavkhadka0/esp_audio/main/hello.wav"

/* ---- Backend / MQTT: this device's identity, from manual provisioning
 * (POST /devices/provision + /devices/:id/assign) against the local
 * tokinomo-backend. Same hardcoded-config pattern as WIFI_SSID above. ---- */
#define MQTT_BROKER_URI "mqtt://192.168.1.91:1883"
#define TENANT_ID       "cmse9nlub0000cj3e0zakkf46"
#define DEVICE_ID       "cmse9o9nc0005cj3e59f0ptgw"

/* ---- Touch buttons --------------------------------------------------- */
#define PAD_DOWNLOAD    TOUCH_PAD_NUM0    // GPIO4  (D4)  -> Button 1: download & store
#define PAD_PLAY        TOUCH_PAD_NUM5    // GPIO12       -> Button 2: playback
// NOTE: GPIO12 (T5) is a boot strapping pin (MTDI). Make sure nothing pulls it
// HIGH at reset (don't touch the pad while the board is booting) or the flash
// voltage select can prevent boot.

/* Raw flash partition that holds the downloaded WAV (see partitions.csv). */
#define AUDIO_PART_LABEL "audio"

/* Touch: a pad is "touched" when its reading drops below 4/5 of baseline. */
#define TRIGGER_NUM     4
#define TRIGGER_DEN     5
#define POLL_MS         50


/* ---- State machine --------------------------------------------------- */
typedef enum { STATE_IDLE, STATE_DOWNLOADING, STATE_PLAYING } app_state_t;
typedef enum { ACT_DOWNLOAD, ACT_PLAY, ACT_MQTT_AUDIO }       action_kind_t;

/* cmd_id/url are only populated for ACT_MQTT_AUDIO; touch-triggered actions
 * leave them empty. Fixed-size so this fits in a FreeRTOS queue item. */
typedef struct
{
    action_kind_t kind;
    char          cmd_id[64];
    char          url[512];
} action_t;

static app_state_t       s_state     = STATE_IDLE;
static SemaphoreHandle_t s_state_mtx = NULL;   // guards s_state
static QueueHandle_t     s_action_q  = NULL;   // touch task / MQTT cb -> worker task
static bool              s_wifi_started = false;   // wifi_manager_init() must run only once


static const touch_pad_t s_pads[] = { PAD_DOWNLOAD, PAD_PLAY };
#define NUM_PADS   (sizeof(s_pads) / sizeof(s_pads[0]))
static uint16_t s_threshold[NUM_PADS];


/*
 * Atomically move IDLE -> target. Returns true only if we claimed the state,
 * which is what guarantees a download and a playback can never overlap.
 */
static bool state_claim(app_state_t target)
{
    bool ok = false;

    xSemaphoreTake(s_state_mtx, portMAX_DELAY);
    if (s_state == STATE_IDLE)
    {
        s_state = target;
        ok = true;
    }
    xSemaphoreGive(s_state_mtx);

    return ok;
}

static void state_release(void)
{
    xSemaphoreTake(s_state_mtx, portMAX_DELAY);
    s_state = STATE_IDLE;
    xSemaphoreGive(s_state_mtx);
}


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


/* ---- Capacitive touch ------------------------------------------------ */
static void touch_init(void)
{
    ESP_ERROR_CHECK(touch_pad_init());
    touch_pad_set_voltage(TOUCH_HVOLT_2V7, TOUCH_LVOLT_0V5, TOUCH_HVOLT_ATTEN_1V);
    touch_pad_set_fsm_mode(TOUCH_FSM_MODE_TIMER);

    for (size_t i = 0; i < NUM_PADS; i++)
    {
        ESP_ERROR_CHECK(touch_pad_config(s_pads[i], 0));
    }

    vTaskDelay(pdMS_TO_TICKS(200));   // let the hardware settle

    for (size_t i = 0; i < NUM_PADS; i++)
    {
        uint16_t val = 0;
        touch_pad_read(s_pads[i], &val);
        s_threshold[i] = (uint16_t)((uint32_t)val * TRIGGER_NUM / TRIGGER_DEN);

        ESP_LOGI(TAG, "Touch pad %d: baseline=%u, threshold=%u",
                 s_pads[i], val, s_threshold[i]);
    }
}

static bool pad_touched(size_t i)
{
    uint16_t val = 0;
    return touch_pad_read(s_pads[i], &val) == ESP_OK && val < s_threshold[i];
}


/*
 * Low-priority monitor task. Only detects fresh presses and dispatches an
 * action to the worker; it never blocks on the heavy work itself, so touch
 * sensing stays responsive.
 */
static void touch_task(void *arg)
{
    bool armed[NUM_PADS];
    for (size_t i = 0; i < NUM_PADS; i++)
    {
        armed[i] = true;
    }

    while (1)
    {
        for (size_t i = 0; i < NUM_PADS; i++)
        {
            if (pad_touched(i))
            {
                if (armed[i])
                {
                    armed[i] = false;

                    action_t act = { .kind = (s_pads[i] == PAD_DOWNLOAD)
                                                 ? ACT_DOWNLOAD : ACT_PLAY };
                    app_state_t want = (act.kind == ACT_DOWNLOAD)
                                           ? STATE_DOWNLOADING : STATE_PLAYING;

                    if (state_claim(want))
                    {
                        ESP_LOGI(TAG, "Pad %d -> %s", s_pads[i],
                                 act.kind == ACT_DOWNLOAD ? "DOWNLOAD" : "PLAY");
                        xQueueSend(s_action_q, &act, 0);
                    }
                    else
                    {
                        ESP_LOGW(TAG, "Busy, ignoring pad %d", s_pads[i]);
                    }
                }
            }
            else
            {
                armed[i] = true;   // released: ready for the next touch
            }
        }

        vTaskDelay(pdMS_TO_TICKS(POLL_MS));
    }
}


/* ---- Worker: performs one heavy action at a time --------------------- */

/* Brings up Wi-Fi (once) and waits up to ~15s for an IP. Safe to call more
 * than once — a no-op past the first successful init. */
static bool ensure_wifi_ready(void)
{
    if (!s_wifi_started)
    {
        ESP_LOGI(TAG, "Bringing up Wi-Fi (ssid=%s)...", WIFI_SSID);

        if (wifi_manager_init(WIFI_SSID, WIFI_PASSWORD) != ESP_OK)
        {
            ESP_LOGE(TAG, "Wi-Fi init failed");
            return false;
        }
        s_wifi_started = true;
    }

    if (!wifi_manager_is_connected())
    {
        // Wait up to ~15 s for an IP (also covers a dropped/reconnecting link).
        for (int i = 0; i < 150 && !wifi_manager_is_connected(); i++)
        {
            vTaskDelay(pdMS_TO_TICKS(100));
        }
    }

    return wifi_manager_is_connected();
}

static void do_download(void)
{
    const esp_partition_t *part = audio_partition();
    if (part == NULL)
    {
        return;
    }

    if (!ensure_wifi_ready())
    {
        ESP_LOGE(TAG, "No Wi-Fi connection, aborting download");
        return;
    }

    // Flush any previous file first so nothing can linger past the end of
    // a new, shorter download.
    if (downloader_erase_partition(part) != ESP_OK)
    {
        ESP_LOGE(TAG, "Erase failed, aborting download");
        return;
    }

    esp_err_t err = downloader_download_to_partition(WAV_URL, part);
    ESP_LOGI(TAG, "Download result: %s", esp_err_to_name(err));
}

static void do_play(void)
{
    const esp_partition_t *part = audio_partition();
    if (part == NULL)
    {
        return;
    }

    esp_err_t err = aud_player_play_partition(part);
    ESP_LOGI(TAG, "Playback result: %s", esp_err_to_name(err));
}

/* Download replaces whatever's currently stored, then plays immediately so
 * a tenant's dashboard push is audible right away. Acks back over MQTT
 * either way so Command.status reflects what really happened on the device. */
static void do_mqtt_audio(const action_t *act)
{
    const esp_partition_t *part = audio_partition();
    bool ok = false;

    if (part != NULL &&
        downloader_erase_partition(part) == ESP_OK &&
        downloader_download_to_partition(act->url, part) == ESP_OK)
    {
        esp_err_t play_err = aud_player_play_partition(part);
        ok = (play_err == ESP_OK);
        ESP_LOGI(TAG, "Playback result: %s", esp_err_to_name(play_err));
    }

    mqtt_ctl_publish_ack(act->cmd_id, ok);
}

static void worker_task(void *arg)
{
    action_t act;

    while (1)
    {
        if (xQueueReceive(s_action_q, &act, portMAX_DELAY) == pdTRUE)
        {
            switch (act.kind)
            {
            case ACT_DOWNLOAD:
                do_download();
                break;
            case ACT_PLAY:
                do_play();
                break;
            case ACT_MQTT_AUDIO:
                do_mqtt_audio(&act);
                break;
            }

            state_release();   // back to IDLE; buttons/MQTT are live again
        }
    }
}

/* Runs on the MQTT client's own task — must not block on the download/play
 * work itself, so it only claims state and hands off to worker_task via the
 * same queue the touch pads use. */
static void on_mqtt_audio_update(const char *cmd_id, const char *url)
{
    if (!state_claim(STATE_DOWNLOADING))
    {
        ESP_LOGW(TAG, "Busy, ignoring audio_update %s", cmd_id);
        mqtt_ctl_publish_ack(cmd_id, false);
        return;
    }

    action_t act = { .kind = ACT_MQTT_AUDIO };
    strncpy(act.cmd_id, cmd_id, sizeof(act.cmd_id) - 1);
    strncpy(act.url, url, sizeof(act.url) - 1);

    if (xQueueSend(s_action_q, &act, 0) != pdTRUE)
    {
        ESP_LOGE(TAG, "Action queue full, dropping audio_update %s", cmd_id);
        state_release();
        mqtt_ctl_publish_ack(cmd_id, false);
    }
}


void app_main(void)
{
    printf("\n");
    printf("=====================================\n");
    printf(" ESP32 Touch Audio (download / play)\n");
    printf("=====================================\n");


    s_state_mtx = xSemaphoreCreateMutex();
    s_action_q  = xQueueCreate(4, sizeof(action_t));

    if (s_state_mtx == NULL || s_action_q == NULL)
    {
        ESP_LOGE(TAG, "Failed to create state primitives");
        return;
    }

    const esp_partition_t *part = audio_partition();
    if (part != NULL)
    {
        ESP_LOGI(TAG, "audio partition: %u bytes @ 0x%06x",
                 (unsigned)part->size, (unsigned)part->address);
    }

    touch_init();

    xTaskCreate(worker_task, "worker", 8192, NULL, 5, NULL);   // does the work
    xTaskCreate(touch_task,  "touch",  4096, NULL, 3, NULL);   // low-prio monitor

    if (ensure_wifi_ready())
    {
        ESP_LOGI(TAG, "Wi-Fi connected, starting MQTT (%s)...", MQTT_BROKER_URI);
        if (mqtt_ctl_start(MQTT_BROKER_URI, TENANT_ID, DEVICE_ID,
                           on_mqtt_audio_update) != ESP_OK)
        {
            ESP_LOGE(TAG, "MQTT start failed");
        }
    }
    else
    {
        ESP_LOGW(TAG, "No Wi-Fi at boot; MQTT audio pushes unavailable until reboot");
    }

    ESP_LOGI(TAG, "Ready. Touch D4/GPIO4 = download, GPIO12 = play.");
}
