// leds.h — WS2812B status + performance lighting.
#pragma once
#include <stdint.h>

void ledsBegin();
void ledsIdle();                 // dim breathing / off
void ledsPulse(uint32_t rgb);    // performance pulse in the configured colour
void ledsStatus(bool online);    // quick connectivity blink
