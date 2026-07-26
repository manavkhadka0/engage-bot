// ota.cpp — OtaTask implementation (audio over-the-air).
#include <Arduino.h>
#include <LittleFS.h>
#include <HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include "mbedtls/sha256.h"
#include "../config.h"
#include "../app.h"
#include "ota.h"

// Normalises a "sha256:<hex>" (or bare hex) checksum to lowercase hex.
static String expectedHex(const char* checksum) {
  String s(checksum);
  int colon = s.indexOf(':');
  if (colon >= 0) s = s.substring(colon + 1);
  s.toLowerCase();
  return s;
}

// Download url → STAGING_CLIP_PATH while hashing; returns hex digest or "".
static String downloadAndHash(const char* url) {
  const bool secure = String(url).startsWith("https");
  WiFiClientSecure tls;
  WiFiClient plain;
  if (secure) tls.setInsecure();   // TODO(backlog): pin the CA / mutual TLS

  HTTPClient http;
  http.setTimeout(15000);
  http.begin(secure ? (WiFiClient&)tls : plain, url);

  const int code = http.GET();
  if (code != HTTP_CODE_OK) {
    Serial.printf("[ota] GET failed http=%d\n", code);
    http.end();
    return "";
  }

  File f = LittleFS.open(STAGING_CLIP_PATH, FILE_WRITE);
  if (!f) { http.end(); return ""; }

  mbedtls_sha256_context ctx;
  mbedtls_sha256_init(&ctx);
  mbedtls_sha256_starts(&ctx, 0);   // 0 = SHA-256

  WiFiClient* stream = http.getStreamPtr();
  uint8_t buf[1024];
  int remaining = http.getSize();   // -1 if chunked
  while (http.connected() && (remaining > 0 || remaining == -1)) {
    size_t avail = stream->available();
    if (avail) {
      int n = stream->readBytes(buf, min(avail, sizeof(buf)));
      f.write(buf, n);
      mbedtls_sha256_update(&ctx, buf, n);
      if (remaining > 0) remaining -= n;
    } else {
      vTaskDelay(pdMS_TO_TICKS(5));
    }
    if (remaining == 0) break;
  }
  f.close();
  http.end();

  uint8_t digest[32];
  mbedtls_sha256_finish(&ctx, digest);
  mbedtls_sha256_free(&ctx);

  char hex[65];
  for (int i = 0; i < 32; i++) sprintf(hex + i * 2, "%02x", digest[i]);
  return String(hex);
}

static void handleAudioUpdate(const Command& c) {
  Serial.printf("[ota] audio_update clip=%s v=%d\n", c.clipId, c.version);

  const String got = downloadAndHash(c.url);
  if (got.isEmpty()) {
    emitAck(c.id, false, "audio_update", c.version, "download_failed");
    return;
  }

  const String want = expectedHex(c.checksum);
  if (want.length() && got != want) {
    Serial.printf("[ota] checksum mismatch want=%s got=%s\n", want.c_str(), got.c_str());
    LittleFS.remove(STAGING_CLIP_PATH);
    emitAck(c.id, false, "audio_update", c.version, "checksum_mismatch");
    return;
  }

  // Atomic-ish swap: replace the active clip with the verified staging file.
  LittleFS.remove(ACTIVE_CLIP_PATH);
  if (!LittleFS.rename(STAGING_CLIP_PATH, ACTIVE_CLIP_PATH)) {
    emitAck(c.id, false, "audio_update", c.version, "swap_failed");
    return;
  }

  Serial.println("[ota] audio swapped OK");
  emitAck(c.id, true, "audio_update", c.version);
}

void OtaTask(void* pv) {
  for (;;) {
    Command c;
    if (xQueueReceive(qOta, &c, portMAX_DELAY) == pdTRUE) {
      if (c.type == CmdType::AUDIO_UPDATE) handleAudioUpdate(c);
      // Firmware OTA (esp_https_ota, A/B partitions) is a post-sprint backlog item.
    }
  }
}
