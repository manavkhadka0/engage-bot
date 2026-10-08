/*
 * Copy this file to `secrets.h` (same folder) and fill it in. `secrets.h` is
 * gitignored — NEVER commit real values, and never put them in main.c, a README
 * or sdkconfig.defaults. The networked firmware includes "secrets.h".
 *
 * Wi-Fi credentials, the broker, and the per-device identity issued by
 * POST /devices/provision (serial + provisionToken) + the ids it is assigned to.
 */
#pragma once

#define SECRET_WIFI_SSID        "your-ssid"
#define SECRET_WIFI_PASSWORD    "your-wifi-password"

#define SECRET_MQTT_BROKER_URI  "mqtts://mqtt.example.com:8883"
#define SECRET_DEVICE_SERIAL    "TK-0001"
#define SECRET_DEVICE_TOKEN     "your-device-provision-token"
#define SECRET_TENANT_ID        "your-tenant-id"
#define SECRET_DEVICE_ID        "your-device-id"
