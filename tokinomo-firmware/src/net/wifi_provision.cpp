// wifi_provision.cpp — WiFiManager captive portal + stored-credential connect.
#include <WiFi.h>
#include <WiFiManager.h>
#include "../config.h"
#include "wifi_provision.h"

void provisionWiFi() {
  pinMode(PROVISION_BTN_PIN, INPUT_PULLUP);
  WiFi.mode(WIFI_STA);

  WiFiManager wm;
  wm.setConfigPortalTimeout(180);          // don't hang forever if unattended
  wm.setConnectTimeout(20);

  const bool forcePortal = (digitalRead(PROVISION_BTN_PIN) == LOW);
  bool ok;

  if (forcePortal) {
    Serial.println("[wifi] provision button held → captive portal");
    ok = wm.startConfigPortal("Tokinomo-Setup");
  } else {
    // Uses credentials saved in NVS by a previous portal session.
    ok = wm.autoConnect("Tokinomo-Setup");
  }

  if (ok) {
    Serial.printf("[wifi] connected ip=%s rssi=%d\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("[wifi] not connected — will keep retrying in NetworkTask");
  }
}
