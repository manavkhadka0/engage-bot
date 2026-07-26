// interaction.cpp — InteractionTask implementation.
#include <Arduino.h>
#include <ArduinoJson.h>
#include "../config.h"
#include "../app.h"
#include "../actuators/servo.h"
#include "../actuators/leds.h"
#include "interaction.h"

enum class State : uint8_t { IDLE, DETECTED, PERFORM, COOLDOWN };

static State    state         = State::IDLE;
static bool     presence      = false;
static uint32_t detectStart   = 0;
static uint32_t cooldownStart = 0;

// ─── Emit helpers ────────────────────────────────────────────────────────
static void emitDwell(uint32_t dwellMs) {
  JsonDocument d;
  d["dwell_ms"] = dwellMs;
  emitEvent("dwell", d);
}

static void emitPlay() {
  JsonDocument d;
  d["clipId"]  = "clip_active";
  d["version"] = 1;
  emitEvent("play", d);
}

static void requestAudio() {
  AudioRequest req{};
  strncpy(req.path, ACTIVE_CLIP_PATH, sizeof(req.path) - 1);
  req.volume = g_cfg.volume;
  xQueueSend(qAudio, &req, 0);
}

// ─── PERFORM: gesture + light + audio, log dwell & play ──────────────────
static void perform() {
  const uint32_t dwell = millis() - detectStart;
  emitDwell(dwell);

  servoPerform();
  ledsPulse(g_cfg.ledColor);
  requestAudio();
  emitPlay();

  cooldownStart = millis();
  state = State::COOLDOWN;
  Serial.printf("[logic] PERFORM (dwell=%lums) → COOLDOWN\n", (unsigned long)dwell);
}

// ─── Command dispatch ────────────────────────────────────────────────────
static void handleCommand(const Command& c) {
  switch (c.type) {
    case CmdType::PLAY:
      requestAudio();
      emitAck(c.id, true, "play", c.version);
      break;

    case CmdType::CONFIG:
      if (c.hasDwell)    g_cfg.dwellTriggerMs = c.dwellMs;
      if (c.hasCooldown) g_cfg.cooldownMs     = c.cooldownMs;
      if (c.hasVolume)   g_cfg.volume         = constrain(c.volume, 0, 100);
      if (c.hasLed)      g_cfg.ledColor       = c.ledColor;
      saveConfig();
      emitAck(c.id, true, "config", c.version);
      Serial.printf("[logic] config: dwell=%lu cooldown=%lu vol=%u led=%06lX\n",
                    (unsigned long)g_cfg.dwellTriggerMs,
                    (unsigned long)g_cfg.cooldownMs, g_cfg.volume,
                    (unsigned long)g_cfg.ledColor);
      break;

    case CmdType::AUDIO_UPDATE:
      xQueueSend(qOta, &c, 0);   // OTA task acks after verify+swap
      break;

    case CmdType::REBOOT:
      emitAck(c.id, true, "reboot", c.version);
      vTaskDelay(pdMS_TO_TICKS(300));
      ESP.restart();
      break;

    default:
      emitAck(c.id, false, "unknown", c.version, "unknown_type");
      break;
  }
}

// ─── State machine tick ──────────────────────────────────────────────────
static void tick() {
  const uint32_t now = millis();
  switch (state) {
    case State::IDLE:
      if (presence) {
        state = State::DETECTED;
        detectStart = now;
        emitEventSimple("detection");
        Serial.println("[logic] IDLE → DETECTED");
      }
      break;

    case State::DETECTED:
      if (!presence) {
        emitDwell(now - detectStart);     // left before triggering
        state = State::IDLE;
      } else if (now - detectStart >= g_cfg.dwellTriggerMs) {
        perform();
      }
      break;

    case State::COOLDOWN:
      // Re-arm only after the cooldown AND the shopper has cleared the zone,
      // so one visit yields exactly one performance.
      if (now - cooldownStart >= g_cfg.cooldownMs && !presence) {
        state = State::IDLE;
        Serial.println("[logic] COOLDOWN → IDLE");
      }
      break;

    default:
      break;
  }
}

void InteractionTask(void* pv) {
  servoBegin();
  ledsBegin();
  ledsIdle();

  for (;;) {
    // Commands take priority and are handled in any state.
    Command c;
    while (xQueueReceive(qCommand, &c, 0) == pdTRUE) handleCommand(c);

    // Latest sensor reading updates presence.
    SensorSample s;
    while (xQueueReceive(qSensor, &s, 0) == pdTRUE) presence = s.presence;

    tick();
    vTaskDelay(pdMS_TO_TICKS(20));
  }
}
