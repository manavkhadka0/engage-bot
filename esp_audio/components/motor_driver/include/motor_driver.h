#ifndef MOTOR_DRIVER_H
#define MOTOR_DRIVER_H

#include "esp_err.h"

/*
 * TB6612FNG (HW-166) driver, channel A only — one DC motor, forward-only for
 * v1 (per the state machine: drive forward through the whole cycle, a reed
 * switch marks "home", there is no reverse). STBY is GPIO-driven and set
 * HIGH once at init, matching the bench-tested Arduino reference this was
 * ported from — NOT the resistor-tied-high approach discussed earlier in
 * ELECTRONICS_ARCHITECTURE.md; that doc still needs updating to match this.
 */

esp_err_t motor_driver_init(void);

void motor_driver_forward(void);

void motor_driver_stop(void);

#endif
