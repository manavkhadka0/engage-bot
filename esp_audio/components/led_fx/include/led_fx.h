#ifndef LED_FX_H
#define LED_FX_H

#include "esp_err.h"

/* WS2812B strip on GPIO4 (D12) — free for this because the standalone test
 * build never initializes capacitive touch (touch_pad_config on the same
 * pin would fight the LED data line); see main.c's header comment. */

esp_err_t led_fx_init(void);

/* All LEDs off. */
void led_fx_off(void);

/* Per-pixel random red/white — call every loop iteration for a flicker
 * effect, not once. Used while audio + motor are active. */
void led_fx_red_white(void);

/* Solid green — used while returning home. */
void led_fx_green(void);

#endif
