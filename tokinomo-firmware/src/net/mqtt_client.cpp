// mqtt_client.cpp — NetworkTask implementation.
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "../config.h"
#include "../app.h"
#include "mqtt_client.h"

static WiFiClient   net;
static PubSubClient mqtt(net);

static String cmdTopic;   // cached t/{tenant}/d/{device}/cmd

// ─── Incoming command → Command struct → qCommand ────────────────────────
static void onMessage(char* topic, byte* payload, unsigned int len) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, len)) {
    Serial.println("[mqtt] cmd JSON parse failed");
    return;
  }

  Command c{};
  strncpy(c.id, doc["id"] | "", sizeof(c.id) - 1);
  const char* type = doc["type"] | "";

  if      (!strcmp(type, "audio_update")) c.type = CmdType::AUDIO_UPDATE;
  else if (!strcmp(type, "play"))         c.type = CmdType::PLAY;
  else if (!strcmp(type, "config"))       c.type = CmdType::CONFIG;
  else if (!strcmp(type, "reboot"))       c.type = CmdType::REBOOT;
  else                                    c.type = CmdType::UNKNOWN;

  strncpy(c.url,      doc["url"]      | "", sizeof(c.url) - 1);
  strncpy(c.checksum, doc["checksum"] | "", sizeof(c.checksum) - 1);
  strncpy(c.clipId,   doc["clipId"]   | "", sizeof(c.clipId) - 1);
  c.version = doc["version"] | 1;

  if (c.type == CmdType::CONFIG) {
    if ((c.hasDwell    = doc["dwellMs"].is<uint32_t>()))    c.dwellMs    = doc["dwellMs"];
    if ((c.hasCooldown = doc["cooldownMs"].is<uint32_t>())) c.cooldownMs = doc["cooldownMs"];
    if ((c.hasVolume   = doc["volume"].is<int>()))          c.volume     = doc["volume"];
    if (doc["ledColor"].is<const char*>()) {
      c.hasLed = true;
      c.ledColor = strtoul(((const char*)doc["ledColor"]) + 1, nullptr, 16); // "#RRGGBB"
    }
  }

  Serial.printf("[mqtt] cmd id=%s type=%s\n", c.id, type);
  xQueueSend(qCommand, &c, 0);
}

// ─── Connect with LWT + subscribe ────────────────────────────────────────
static bool connect() {
  Serial.printf("[mqtt] connecting %s:%u\n", g_id.mqttHost.c_str(), g_id.mqttPort);

  // LWT: retained offline status if we drop ungracefully → backend marks OFFLINE.
  JsonDocument will;
  will["v"] = 1; will["status"] = "offline"; will["fw"] = g_id.fw; will["ts"] = 0;
  String willPayload;
  serializeJson(will, willPayload);
  const String willTopic = topicFor("status");

  const bool ok = mqtt.connect(
      g_id.deviceId.c_str(),
      g_id.mqttUser.length() ? g_id.mqttUser.c_str() : nullptr,
      g_id.mqttPass.length() ? g_id.mqttPass.c_str() : nullptr,
      willTopic.c_str(), 1, true, willPayload.c_str());

  if (!ok) {
    Serial.printf("[mqtt] connect failed rc=%d\n", mqtt.state());
    return false;
  }

  // Presence: retained online status.
  JsonDocument up;
  up["v"] = 1; up["status"] = "online"; up["fw"] = g_id.fw; up["ts"] = nowTs();
  String upPayload;
  serializeJson(up, upPayload);
  mqtt.publish(willTopic.c_str(), (const uint8_t*)upPayload.c_str(), upPayload.length(), true);

  mqtt.subscribe(cmdTopic.c_str(), 1);
  Serial.printf("[mqtt] connected; subscribed %s\n", cmdTopic.c_str());
  return true;
}

void NetworkTask(void* pv) {
  cmdTopic = topicFor("cmd");
  mqtt.setServer(g_id.mqttHost.c_str(), g_id.mqttPort);
  mqtt.setBufferSize(MQTT_BUFFER_BYTES);
  mqtt.setKeepAlive(MQTT_KEEPALIVE_S);
  mqtt.setCallback(onMessage);

  for (;;) {
    if (WiFi.status() != WL_CONNECTED) {
      g_mqttConnected = false;
      WiFi.reconnect();
      vTaskDelay(pdMS_TO_TICKS(1000));
      continue;
    }

    if (!mqtt.connected()) {
      g_mqttConnected = false;
      if (!connect()) { vTaskDelay(pdMS_TO_TICKS(3000)); continue; }
      g_mqttConnected = true;
    }

    mqtt.loop();

    // Drain buffered outbound messages (flush after reconnect).
    OutboundMsg msg;
    while (mqtt.connected() && xQueueReceive(qOutbound, &msg, 0) == pdTRUE) {
      const String topic = topicFor(msg.channel);
      const bool sent = mqtt.publish(
          topic.c_str(), (const uint8_t*)msg.payload, strlen(msg.payload), msg.retain);
      if (!sent) {                       // publish failed → requeue, back off
        xQueueSendToFront(qOutbound, &msg, 0);
        break;
      }
    }

    vTaskDelay(pdMS_TO_TICKS(10));
  }
}
