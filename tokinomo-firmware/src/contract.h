// contract.h — the MQTT contract ① message shapes, shared across tasks.
// Mirrors ELECTRONICS_ARCHITECTURE.md §4 and the backend IngestionWorker.
#pragma once

#include <Arduino.h>

// ─── Sensor → Interaction ────────────────────────────────────────────────
struct SensorSample {
  bool     presence;      // anyone in range?
  bool     moving;        // moving target present
  bool     stationary;    // stationary target present
  uint16_t distanceCm;    // nearest target distance
};

// ─── Command (Cloud → Device) ────────────────────────────────────────────
enum class CmdType : uint8_t { UNKNOWN, AUDIO_UPDATE, PLAY, CONFIG, REBOOT };

struct Command {
  char    id[40];
  CmdType type;
  // audio_update
  char    url[256];
  char    checksum[80];   // "sha256:..."
  char    clipId[40];
  int     version;
  // config (only *has* fields are applied)
  bool    hasDwell,   hasCooldown, hasVolume, hasLed;
  uint32_t dwellMs,   cooldownMs;
  int     volume;
  uint32_t ledColor;
};

// ─── Interaction → Audio ─────────────────────────────────────────────────
struct AudioRequest {
  char    path[64];
  uint8_t volume;         // 0–100
};

// ─── Any task → Network (published verbatim) ─────────────────────────────
// channel ∈ status | telemetry | event | ack
struct OutboundMsg {
  char    channel[12];
  char    payload[300];
  uint8_t qos;
  bool    retain;
};
