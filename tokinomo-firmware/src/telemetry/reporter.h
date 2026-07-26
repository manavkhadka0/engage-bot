// reporter.h — TelemetryTask: periodic health heartbeat.
#pragma once

// FreeRTOS task. Publishes a telemetry payload every TELEMETRY_EVERY_MS
// (rssi, uptime, free heap, fw) so the backend keeps lastSeen fresh.
void TelemetryTask(void* pv);
