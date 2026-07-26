# data/ — LittleFS image contents

Everything here is flashed to the device's LittleFS partition by
`pio run -t uploadfs`.

- **`active.wav`** — the clip the device plays on trigger. A short 660 Hz beep
  ships as a placeholder so audio works out of the box. Replace it with the
  real clip, or push one over the air (`audio_update` command) which writes
  `/staging.wav`, verifies the checksum, and swaps it to `active.wav`.

**Audio format contract (③):** WAV, PCM, **mono, 16 kHz, 16-bit**. Keep clips
small (a few seconds) — flash and I²S CPU both like it. Agree the final format
and max size with Backend before recording the real lines.
