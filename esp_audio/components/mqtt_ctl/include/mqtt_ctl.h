#ifndef MQTT_CTL_H
#define MQTT_CTL_H

#include <stdbool.h>
#include "esp_err.h"

/* Called when a `cmd` message with type "audio_update" arrives. cmd_id and
 * url point into short-lived internal buffers — copy anything you need to
 * keep past the call returning. */
typedef void (*mqtt_ctl_audio_update_cb_t)(const char *cmd_id, const char *url);

/* Connects to the broker and subscribes to t/{tenant_id}/d/{device_id}/cmd.
 * Publishes {"status":"online"} to the `status` channel once connected. */
esp_err_t mqtt_ctl_start(const char *broker_uri,
                         const char *tenant_id,
                         const char *device_id,
                         mqtt_ctl_audio_update_cb_t on_audio_update);

/* Publishes {"id":cmd_id,"ok":ok,"type":"audio_update"} to the `ack` channel. */
void mqtt_ctl_publish_ack(const char *cmd_id, bool ok);

#endif
