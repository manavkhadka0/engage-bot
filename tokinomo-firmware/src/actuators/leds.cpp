// leds.cpp — FastLED WS2812B driver.
#include <FastLED.h>
#include "../config.h"
#include "leds.h"

static CRGB leds[LED_COUNT];

void ledsBegin() {
  FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, LED_COUNT);
  FastLED.setBrightness(120);
  fill_solid(leds, LED_COUNT, CRGB::Black);
  FastLED.show();
}

void ledsIdle() {
  fill_solid(leds, LED_COUNT, CRGB::Black);
  FastLED.show();
}

void ledsPulse(uint32_t rgb) {
  const CRGB color(rgb >> 16 & 0xFF, rgb >> 8 & 0xFF, rgb & 0xFF);
  for (int b = 0; b <= 255; b += 15) {         // ramp up
    fill_solid(leds, LED_COUNT, color);
    FastLED.setBrightness(b);
    FastLED.show();
    delay(12);
  }
  for (int b = 255; b >= 0; b -= 15) {         // ramp down
    FastLED.setBrightness(b);
    FastLED.show();
    delay(12);
  }
  FastLED.setBrightness(120);
  ledsIdle();
}

void ledsStatus(bool online) {
  const CRGB color = online ? CRGB::Green : CRGB::Red;
  fill_solid(leds, LED_COUNT, color);
  FastLED.show();
  delay(120);
  ledsIdle();
}
