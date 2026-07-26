// app.h — global runtime state, queues, and cross-cutting helpers.
#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include "contract.h"

// ─── Identity (from NVS, falls back to config.h defaults) ────────────────
struct Identity {
  String serial;
  String tenantId;
  String deviceId;
  String mqttHost;
  uint16_t mqttPort;
  String mqttUser;
  String mqttPass;
  String fw;
};

// ─── Runtime config (mutable via `config` command, persisted to NVS) ──────
struct RuntimeConfig {
  uint32_t dwellTriggerMs;
  uint32_t cooldownMs;
  uint8_t  volume;        // 0–100
  uint32_t ledColor;      // 0xRRGGBB
};

extern Identity      g_id;
extern RuntimeConfig g_cfg;
extern volatile bool g_mqttConnected;

// ─── Inter-task queues (created in main setup) ───────────────────────────
extern QueueHandle_t qSensor;    // SensorSample   Sensor    → Interaction
extern QueueHandle_t qCommand;   // Command        Network   → Interaction
extern QueueHandle_t qAudio;     // AudioRequest   Interaction → Audio
extern QueueHandle_t qOta;       // Command        Interaction → OTA
extern QueueHandle_t qOutbound;  // OutboundMsg    any       → Network

// ─── Identity / config persistence (NVS) ─────────────────────────────────
void loadIdentity();
void loadConfig();
void saveConfig();

// ─── Topic + publish helpers ─────────────────────────────────────────────
String topicFor(const char* channel);   // t/{tenant}/d/{device}/{channel}

// Enqueue an outbound publish. Non-blocking; if the buffer is full the oldest
// message is dropped (offline tolerance — shop Wi-Fi will be flaky).
void publishOut(const char* channel, const String& json,
                uint8_t qos = 1, bool retain = false);

// Convenience wrappers used by the interaction/telemetry tasks.
void emitEvent(const char* type, JsonDocument& extra);   // adds ts+type
void emitEventSimple(const char* type);
void emitAck(const char* id, bool ok, const char* type, int version,
             const char* error = nullptr);

// Unix seconds if NTP synced, else 0 (backend falls back to now()).
uint32_t nowTs();

// ─── Task entrypoints ────────────────────────────────────────────────────
void NetworkTask(void* pv);
void SensorTask(void* pv);
void InteractionTask(void* pv);
void AudioTask(void* pv);
void TelemetryTask(void* pv);
void OtaTask(void* pv);
