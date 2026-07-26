// ota.h — OtaTask: audio_update download/verify/swap (+ firmware OTA hook).
#pragma once

// FreeRTOS task. Consumes Command (audio_update) from qOta:
//   download url → LittleFS staging → verify sha256 → atomic swap → ack.
// Large payloads never cross MQTT; only the HTTPS URL + checksum do (§4).
void OtaTask(void* pv);
