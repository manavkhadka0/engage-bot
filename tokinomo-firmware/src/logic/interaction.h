// interaction.h — InteractionTask: the v1 state machine + command dispatch.
#pragma once

// FreeRTOS task. Consumes qSensor + qCommand and orchestrates the loop:
//   IDLE → DETECTED → (dwell measured) → PERFORM → COOLDOWN → IDLE
// Drives servo/LEDs, requests audio, emits detection/dwell/play events, and
// applies play/config/reboot/audio_update commands.
void InteractionTask(void* pv);
