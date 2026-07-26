// wifi_provision.h — captive-portal Wi-Fi onboarding (WiFiManager).
#pragma once

// Blocks until Wi-Fi is connected. Holding PROVISION_BTN on boot forces the
// captive portal ("Tokinomo-Setup") so an installer can pick the shop SSID.
void provisionWiFi();
