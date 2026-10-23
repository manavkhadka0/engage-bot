#!/usr/bin/env python3
"""Generate a royalty-free test clip in the only format the player accepts
(WAV, mono, 16-bit PCM). No third-party audio is kept in this repo.

    python3 tools/make_test_clip.py                 # -> test_clip.wav (6 s, 22.05 kHz)
    python3 tools/make_test_clip.py out.wav 10      # custom name / seconds
"""
import math
import struct
import sys
import wave

out = sys.argv[1] if len(sys.argv) > 1 else "test_clip.wav"
seconds = float(sys.argv[2]) if len(sys.argv) > 2 else 6.0
rate = 22050
notes = [523.25, 659.25, 783.99, 659.25]  # C5 E5 G5 E5, one note per 0.5 s
n = int(rate * seconds)
frames = bytearray()
for i in range(n):
    t = i / rate
    f = notes[int(t / 0.5) % len(notes)]
    env = min(1.0, (t % 0.5) * 40, (0.5 - t % 0.5) * 40)  # short fade to avoid clicks
    frames += struct.pack("<h", int(9000 * env * math.sin(2 * math.pi * f * t)))
with wave.open(out, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(rate)
    w.writeframes(bytes(frames))
print(f"wrote {out}: {seconds:g} s, {rate} Hz, mono, 16-bit")
