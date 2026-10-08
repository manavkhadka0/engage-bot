#ifndef MOTOR_DRIVER_H
#define MOTOR_DRIVER_H

#include "esp_err.h"

/*
 * Single-GPIO motor enable through an optocoupler (galvanic isolation).
 * GPIO14 LOW  = optocoupler on  = motor rotates
 * GPIO14 HIGH = optocoupler off = motor stopped
 *
 * Direction/speed are no longer ESP-driven — AIN1/AIN2/STBY (GPIO13/23/19)
 * and PWM are gone. The public forward/stop names stay so the state machine
 * does not change: forward = run, stop = stop.
 */

esp_err_t motor_driver_init(void);

void motor_driver_forward(void);

void motor_driver_stop(void);

#endif
