// ld2410.cpp — SensorTask implementation.
#include <Arduino.h>
#include <ld2410.h>          // library (ncmreynolds/ld2410)
#include "../config.h"
#include "../app.h"           // SensorTask() declared here

static ld2410 radar;

void SensorTask(void* pv) {
  Serial1.begin(LD2410_BAUD, SERIAL_8N1, LD2410_RX_PIN, LD2410_TX_PIN);
  if (radar.begin(Serial1)) {
    Serial.println("[sensor] LD2410 ready");
  } else {
    Serial.println("[sensor] LD2410 not detected — check UART wiring/baud");
  }

  SensorSample last{};
  for (;;) {
    radar.read();
    if (radar.isConnected()) {
      SensorSample s{};
      s.presence   = radar.presenceDetected();
      s.moving     = radar.movingTargetDetected();
      s.stationary = radar.stationaryTargetDetected();
      s.distanceCm = radar.stationaryTargetDistance();
      if (s.distanceCm == 0) s.distanceCm = radar.movingTargetDistance();

      // Only push on change of presence or meaningful distance delta — keeps
      // the interaction queue quiet and lets the FSM own timing.
      if (s.presence != last.presence ||
          abs((int)s.distanceCm - (int)last.distanceCm) > 20) {
        xQueueSend(qSensor, &s, 0);
        last = s;
      }
    }
    vTaskDelay(pdMS_TO_TICKS(100));   // ~10 Hz
  }
}
