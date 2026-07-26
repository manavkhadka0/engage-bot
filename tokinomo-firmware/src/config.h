// config.h — pins, thresholds, defaults, topic templates.
// Pin map mirrors ELECTRONICS_ARCHITECTURE.md §2.1 (finalise with the schematic).
#pragma once

// ─── Firmware ────────────────────────────────────────────────────────────
#define FW_VERSION            "1.0.0"

// ─── LD2410 mmWave (UART1) ───────────────────────────────────────────────
#define LD2410_RX_PIN         18      // ESP RX  ← sensor TX
#define LD2410_TX_PIN         17      // ESP TX  → sensor RX
#define LD2410_BAUD           256000
#define LD2410_UART_NUM       1       // Serial1

// ─── MAX98357A (I²S audio out) ───────────────────────────────────────────
#define I2S_BCLK_PIN          15
#define I2S_LRCLK_PIN         16
#define I2S_DIN_PIN           7

// ─── Servo (5V rail, not 3V3) ────────────────────────────────────────────
#define SERVO_PIN             4
#define SERVO_REST_DEG        10
#define SERVO_PERFORM_DEG     120

// ─── WS2812B ─────────────────────────────────────────────────────────────
#define LED_DATA_PIN          5
#define LED_COUNT             8

// ─── Discrete IO ─────────────────────────────────────────────────────────
#define PROVISION_BTN_PIN     0       // hold on boot → Wi-Fi captive portal
#define STATUS_LED_PIN        2
#define BATTERY_ADC_PIN       1       // optional pack divider

// ─── Interaction defaults (runtime-overridable via `config` command → NVS) ─
#define DEFAULT_DWELL_TRIGGER_MS  3000    // linger before we PERFORM
#define DEFAULT_COOLDOWN_MS       15000   // ignore triggers after a play
#define DEFAULT_VOLUME            80       // 0–100
#define DEFAULT_LED_COLOR         0x00A0E0 // brand cyan

// ─── Telemetry / audio ───────────────────────────────────────────────────
#define TELEMETRY_EVERY_MS    30000
#define ACTIVE_CLIP_PATH      "/active.wav"   // LittleFS: currently playing clip
#define STAGING_CLIP_PATH     "/staging.wav"  // OTA download target before swap

// ─── MQTT ────────────────────────────────────────────────────────────────
// Topic template: t/{tenantId}/d/{deviceId}/{channel}
#define MQTT_KEEPALIVE_S      30
#define MQTT_BUFFER_BYTES     2048    // signed audio URLs exceed PubSubClient's 256 default
#define OUTBOUND_QUEUE_LEN    64      // RAM ring buffer for offline tolerance

// ─── Compile-time identity fallback (bench only) ─────────────────────────
// Real identity is read from NVS ("tokinomo" namespace). These are used only
// when NVS is empty, so a fresh board can be bench-tested before provisioning.
// Provision via backend, then set NVS keys (see README) or edit these.
#define DEFAULT_SERIAL        "ESP32-TEST-01"
#define DEFAULT_TENANT_ID     "PASTE_TENANT_ID"
#define DEFAULT_DEVICE_ID     "PASTE_DEVICE_ID"
#define DEFAULT_MQTT_HOST     "192.168.1.42"   // LAN IP of the docker host (not localhost)
#define DEFAULT_MQTT_PORT     1883
#define DEFAULT_MQTT_USER     ""                // EMQX serial (blank = anonymous)
#define DEFAULT_MQTT_PASS     ""                // EMQX provisioning token

#define NTP_SERVER            "pool.ntp.org"
