// reporter.cpp — TelemetryTask implementation.
#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include "../config.h"
#include "../app.h"
#include "reporter.h"

void TelemetryTask(void* pv) {
  // Small stagger so the first heartbeat doesn't race the MQTT connect.
  vTaskDelay(pdMS_TO_TICKS(5000));

  for (;;) {
    JsonDocument doc;
    doc["v"]         = 1;
    doc["ts"]        = nowTs();
    doc["rssi"]      = WiFi.RSSI();
    doc["uptime_s"]  = millis() / 1000;
    doc["free_heap"] = ESP.getFreeHeap();
    doc["fw"]        = g_id.fw;

    String out;
    serializeJson(doc, out);
    publishOut("telemetry", out, 1, false);

    vTaskDelay(pdMS_TO_TICKS(TELEMETRY_EVERY_MS));
  }
}
