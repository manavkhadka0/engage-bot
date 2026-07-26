// player.cpp — AudioTask implementation (ESP8266Audio → I2S / MAX98357A).
#include <Arduino.h>
#include <LittleFS.h>
#include <AudioFileSourceLittleFS.h>
#include <AudioGeneratorWAV.h>
#include <AudioOutputI2S.h>
#include "../config.h"
#include "../app.h"
#include "player.h"

static AudioOutputI2S*         out  = nullptr;
static AudioGeneratorWAV*      wav  = nullptr;
static AudioFileSourceLittleFS* file = nullptr;

static void stopPlayback() {
  if (wav && wav->isRunning()) wav->stop();
  if (file) { delete file; file = nullptr; }
  if (wav)  { delete wav;  wav  = nullptr; }
}

static void startPlayback(const AudioRequest& req) {
  stopPlayback();
  if (!LittleFS.exists(req.path)) {
    Serial.printf("[audio] missing clip %s\n", req.path);
    return;
  }
  out->SetGain((float)req.volume / 100.0f);   // 0.0–1.0
  file = new AudioFileSourceLittleFS(req.path);
  wav  = new AudioGeneratorWAV();
  wav->begin(file, out);
  Serial.printf("[audio] play %s vol=%u\n", req.path, req.volume);
}

void AudioTask(void* pv) {
  out = new AudioOutputI2S();
  out->SetPinout(I2S_BCLK_PIN, I2S_LRCLK_PIN, I2S_DIN_PIN);
  out->SetOutputModeMono(true);

  for (;;) {
    AudioRequest req;
    // Poll for a new request without blocking while a clip is playing.
    const TickType_t wait = (wav && wav->isRunning()) ? 0 : pdMS_TO_TICKS(50);
    if (xQueueReceive(qAudio, &req, wait) == pdTRUE) {
      startPlayback(req);   // newest request preempts (barge-in)
    }

    if (wav && wav->isRunning()) {
      if (!wav->loop()) stopPlayback();   // reached end of clip
    }
  }
}
