// player.h — AudioTask: I2S WAV playback from LittleFS on request.
#pragma once

// FreeRTOS task. Owns the I2S output + WAV generator. Waits on qAudio for an
// AudioRequest (clip path + volume) and plays it to completion (MAX98357A).
void AudioTask(void* pv);
