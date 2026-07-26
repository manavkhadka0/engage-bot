// main.cpp — boot, shared state, and FreeRTOS task wiring.
// Architecture: ELECTRONICS_ARCHITECTURE.md §3 (task graph + state machine).
#include <Arduino.h>
#include <Preferences.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <time.h>

#include "config.h"
#include "app.h"
#include "net/wifi_provision.h"

// ─── Globals ─────────────────────────────────────────────────────────────
Identity      g_id;
RuntimeConfig g_cfg;
volatile bool g_mqttConnected = false;

QueueHandle_t qSensor   = nullptr;
QueueHandle_t qCommand  = nullptr;
QueueHandle_t qAudio    = nullptr;
QueueHandle_t qOta      = nullptr;
QueueHandle_t qOutbound = nullptr;

static Preferences prefs;

// ─── Identity / config persistence ───────────────────────────────────────
void loadIdentity() {
  prefs.begin("tokinomo", true);   // read-only
  g_id.serial   = prefs.getString("serial",   DEFAULT_SERIAL);
  g_id.tenantId = prefs.getString("tenant",   DEFAULT_TENANT_ID);
  g_id.deviceId = prefs.getString("device",   DEFAULT_DEVICE_ID);
  g_id.mqttHost = prefs.getString("mqttHost", DEFAULT_MQTT_HOST);
  g_id.mqttPort = prefs.getUShort("mqttPort", DEFAULT_MQTT_PORT);
  g_id.mqttUser = prefs.getString("mqttUser", DEFAULT_MQTT_USER);
  g_id.mqttPass = prefs.getString("mqttPass", DEFAULT_MQTT_PASS);
  prefs.end();
  g_id.fw = FW_VERSION;
}

void loadConfig() {
  prefs.begin("tokinomo", true);
  g_cfg.dwellTriggerMs = prefs.getULong("dwell",    DEFAULT_DWELL_TRIGGER_MS);
  g_cfg.cooldownMs     = prefs.getULong("cooldown", DEFAULT_COOLDOWN_MS);
  g_cfg.volume         = prefs.getUChar("volume",   DEFAULT_VOLUME);
  g_cfg.ledColor       = prefs.getULong("led",      DEFAULT_LED_COLOR);
  prefs.end();
}

void saveConfig() {
  prefs.begin("tokinomo", false);  // read-write
  prefs.putULong("dwell",    g_cfg.dwellTriggerMs);
  prefs.putULong("cooldown", g_cfg.cooldownMs);
  prefs.putUChar("volume",   g_cfg.volume);
  prefs.putULong("led",      g_cfg.ledColor);
  prefs.end();
}

// ─── Topic + publish helpers ─────────────────────────────────────────────
String topicFor(const char* channel) {
  return "t/" + g_id.tenantId + "/d/" + g_id.deviceId + "/" + channel;
}

void publishOut(const char* channel, const String& json, uint8_t qos, bool retain) {
  OutboundMsg msg{};
  strncpy(msg.channel, channel, sizeof(msg.channel) - 1);
  strncpy(msg.payload, json.c_str(), sizeof(msg.payload) - 1);
  msg.qos = qos;
  msg.retain = retain;

  if (xQueueSend(qOutbound, &msg, 0) != pdTRUE) {
    // Buffer full: drop the oldest and retry (keep newest telemetry/events).
    OutboundMsg discard;
    xQueueReceive(qOutbound, &discard, 0);
    xQueueSend(qOutbound, &msg, 0);
  }
}

uint32_t nowTs() {
  time_t t = time(nullptr);
  return (t > 1700000000UL) ? (uint32_t)t : 0;
}

void emitEvent(const char* type, JsonDocument& doc) {
  doc["v"]    = 1;
  doc["ts"]   = nowTs();
  doc["type"] = type;
  String out;
  serializeJson(doc, out);
  publishOut("event", out, 1, false);
}

void emitEventSimple(const char* type) {
  JsonDocument doc;
  emitEvent(type, doc);
}

void emitAck(const char* id, bool ok, const char* type, int version, const char* error) {
  JsonDocument doc;
  doc["id"] = id;
  doc["ok"] = ok;
  if (type)  doc["type"]    = type;
  if (ok)    doc["version"] = version;
  if (error) doc["error"]   = error;
  doc["ts"] = nowTs();
  String out;
  serializeJson(doc, out);
  publishOut("ack", out, 1, false);
}

// ─── Boot ────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.printf("\n[boot] Tokinomo device fw=%s\n", FW_VERSION);

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  if (!LittleFS.begin(true)) {
    Serial.println("[boot] LittleFS mount failed");
  }

  loadIdentity();
  loadConfig();
  Serial.printf("[boot] serial=%s tenant=%s device=%s\n",
                g_id.serial.c_str(), g_id.tenantId.c_str(), g_id.deviceId.c_str());

  // Wi-Fi onboarding: hold the provision button on boot for the captive portal,
  // otherwise connect with stored credentials (blocks until connected/portal).
  provisionWiFi();
  configTime(0, 0, NTP_SERVER);   // UTC for event timestamps

  // Queues.
  qSensor   = xQueueCreate(8,  sizeof(SensorSample));
  qCommand  = xQueueCreate(8,  sizeof(Command));
  qAudio    = xQueueCreate(4,  sizeof(AudioRequest));
  qOta      = xQueueCreate(4,  sizeof(Command));
  qOutbound = xQueueCreate(OUTBOUND_QUEUE_LEN, sizeof(OutboundMsg));

  // Tasks — pin the two heavy I/O tasks to separate cores so a Wi-Fi stall
  // never starves audio (§10 concurrency risk).
  xTaskCreatePinnedToCore(NetworkTask,     "net",   8192, nullptr, 4, nullptr, 0);
  xTaskCreatePinnedToCore(AudioTask,       "audio", 8192, nullptr, 3, nullptr, 1);
  xTaskCreatePinnedToCore(SensorTask,      "sense", 4096, nullptr, 3, nullptr, 1);
  xTaskCreatePinnedToCore(InteractionTask, "logic", 6144, nullptr, 3, nullptr, 1);
  xTaskCreatePinnedToCore(TelemetryTask,   "telem", 3072, nullptr, 2, nullptr, 0);
  xTaskCreatePinnedToCore(OtaTask,         "ota",   8192, nullptr, 2, nullptr, 0);

  Serial.println("[boot] tasks started");
}

void loop() {
  vTaskDelete(nullptr);   // everything runs in tasks
}
