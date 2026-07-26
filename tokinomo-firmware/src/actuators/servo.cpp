// servo.cpp — ESP32Servo wrapper. Powered from the 5V rail (see §2.2 bulk cap).
#include <ESP32Servo.h>
#include "../config.h"
#include "servo.h"

static Servo servo;

void servoBegin() {
  ESP32PWM::allocateTimer(0);
  servo.setPeriodHertz(50);
  servo.attach(SERVO_PIN, 500, 2400);
  servo.write(SERVO_REST_DEG);
}

void servoRest() { servo.write(SERVO_REST_DEG); }

void servoPerform() {
  // Small attention wiggle toward the shopper, then back to rest.
  for (int i = 0; i < 2; i++) {
    servo.write(SERVO_PERFORM_DEG);
    delay(220);
    servo.write(SERVO_REST_DEG);
    delay(180);
  }
}
