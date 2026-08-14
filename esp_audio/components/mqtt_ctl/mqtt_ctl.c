#include "mqtt_ctl.h"

#include <stdio.h>
#include <string.h>

#include "esp_log.h"
#include "mqtt_client.h"

static const char *TAG = "MQTT_CTL";

static esp_mqtt_client_handle_t s_client = NULL;
static mqtt_ctl_audio_update_cb_t s_cb   = NULL;

static char s_cmd_topic[160];
static char s_ack_topic[160];
static char s_status_topic[160];

// Finds "key":"value" in a flat, backend-generated JSON object (no nested
// objects/arrays, no escaped quotes in values) and copies value into out.
static bool json_extract_string(const char *json, const char *key,
                                char *out, size_t out_size)
{
    char needle[32];
    int n = snprintf(needle, sizeof(needle), "\"%s\":\"", key);
    if (n <= 0 || (size_t)n >= sizeof(needle))
    {
        return false;
    }

    const char *p = strstr(json, needle);
    if (!p)
    {
        return false;
    }
    p += n;

    const char *end = strchr(p, '"');
    if (!end)
    {
        return false;
    }

    size_t len = (size_t)(end - p);
    if (len >= out_size)
    {
        len = out_size - 1;
    }
    memcpy(out, p, len);
    out[len] = '\0';
    return true;
}

static void publish_status_online(void)
{
    const char *payload = "{\"status\":\"online\"}";
    esp_mqtt_client_publish(s_client, s_status_topic, payload, 0, 1, 0);
}

static void handle_cmd_message(const esp_mqtt_event_handle_t event)
{
    // Payloads are sized to fit in one MQTT_BUFFER_SIZE-worth of data (see
    // sdkconfig.defaults); a fragmented/oversized message means something is
    // bigger than expected, so log it and bail rather than misparse a partial
    // JSON blob.
    if (event->current_data_offset != 0 || event->data_len < event->total_data_len)
    {
        ESP_LOGW(TAG, "Fragmented/oversized cmd payload (%d/%d bytes), ignoring",
                 event->data_len, event->total_data_len);
        return;
    }

    char json[700];
    size_t dlen = (size_t)event->data_len < sizeof(json) - 1
                      ? (size_t)event->data_len
                      : sizeof(json) - 1;
    memcpy(json, event->data, dlen);
    json[dlen] = '\0';

    char type[32] = {0};
    char id[64]   = {0};
    char url[512] = {0};

    if (!json_extract_string(json, "type", type, sizeof(type)) ||
        strcmp(type, "audio_update") != 0)
    {
        ESP_LOGW(TAG, "Ignoring cmd with type=%s", type);
        return;
    }
    if (!json_extract_string(json, "id", id, sizeof(id)) ||
        !json_extract_string(json, "url", url, sizeof(url)))
    {
        ESP_LOGE(TAG, "audio_update missing id/url");
        return;
    }

    ESP_LOGI(TAG, "audio_update id=%s", id);
    if (s_cb)
    {
        s_cb(id, url);
    }
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base,
                               int32_t event_id, void *event_data)
{
    (void)handler_args;
    (void)base;

    esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;

    switch ((esp_mqtt_event_id_t)event_id)
    {
    case MQTT_EVENT_CONNECTED:
        ESP_LOGI(TAG, "Connected, subscribing to %s", s_cmd_topic);
        esp_mqtt_client_subscribe(s_client, s_cmd_topic, 1);
        publish_status_online();
        break;

    case MQTT_EVENT_DISCONNECTED:
        ESP_LOGW(TAG, "Disconnected");
        break;

    case MQTT_EVENT_DATA:
    {
        char topic[160];
        size_t tlen = (size_t)event->topic_len < sizeof(topic) - 1
                          ? (size_t)event->topic_len
                          : sizeof(topic) - 1;
        memcpy(topic, event->topic, tlen);
        topic[tlen] = '\0';

        if (strcmp(topic, s_cmd_topic) == 0)
        {
            handle_cmd_message(event);
        }
        break;
    }

    case MQTT_EVENT_ERROR:
        ESP_LOGE(TAG, "MQTT error");
        break;

    default:
        break;
    }
}

esp_err_t mqtt_ctl_start(const char *broker_uri,
                         const char *username,
                         const char *password,
                         const char *tenant_id,
                         const char *device_id,
                         mqtt_ctl_audio_update_cb_t on_audio_update)
{
    s_cb = on_audio_update;

    snprintf(s_cmd_topic, sizeof(s_cmd_topic), "t/%s/d/%s/cmd", tenant_id, device_id);
    snprintf(s_ack_topic, sizeof(s_ack_topic), "t/%s/d/%s/ack", tenant_id, device_id);
    snprintf(s_status_topic, sizeof(s_status_topic), "t/%s/d/%s/status", tenant_id, device_id);

    esp_mqtt_client_config_t cfg = {
        .broker.address.uri = broker_uri,
        .credentials.username = username,
        .credentials.authentication.password = password,
    };

    s_client = esp_mqtt_client_init(&cfg);
    if (s_client == NULL)
    {
        ESP_LOGE(TAG, "esp_mqtt_client_init failed");
        return ESP_FAIL;
    }

    esp_mqtt_client_register_event(s_client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    return esp_mqtt_client_start(s_client);
}

void mqtt_ctl_publish_ack(const char *cmd_id, bool ok)
{
    if (s_client == NULL)
    {
        return;
    }

    char payload[160];
    snprintf(payload, sizeof(payload),
             "{\"id\":\"%s\",\"ok\":%s,\"type\":\"audio_update\"}",
             cmd_id, ok ? "true" : "false");

    esp_mqtt_client_publish(s_client, s_ack_topic, payload, 0, 1, 0);
}
