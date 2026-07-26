// servo.h — performance gesture on the micro servo.
#pragma once

void servoBegin();
void servoRest();       // move to resting angle
void servoPerform();    // one attention gesture (non-blocking-ish sweep)
