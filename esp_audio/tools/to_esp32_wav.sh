#!/usr/bin/env bash
#
# Convert any audio file (mp3, m4a, flac, ogg, opus, wav, ...) into the
# format expected by this project's aud_player: 16-bit signed PCM,
# mono WAV. The player reads the sample rate from the WAV header and
# clocks I2S to match (MAX98357A), so higher rates sound better — the
# old 16 kHz default was leftover from an 8-bit DAC / 1.5 MB partition.
#
# Default is 44100 Hz. A 30 s clip at that rate is ~2.6 MB; the audio
# partition is ~12.4 MB (partitions.csv). Drop the rate only if the
# output does not fit.
#
# Usage:
#   ./to_esp32_wav.sh input.mp3 [output.wav]
#   ./to_esp32_wav.sh input.mp3 [output.wav] [sample_rate_hz]
#
# If output.wav is omitted, it's written next to the input as
# "<name>_esp32.wav".
#
# Requires: ffmpeg (brew install ffmpeg)

set -euo pipefail

SAMPLE_RATE="44100"
# audio partition size in partitions.csv (0xBE0000)
AUDIO_PARTITION_BYTES=12451840

usage() {
    echo "Usage: $0 <input_audio> [output.wav] [sample_rate_hz]" >&2
    echo "  e.g.: $0 song.mp3" >&2
    echo "        $0 song.mp3 hello.wav" >&2
    echo "        $0 song.mp3 hello.wav 22050" >&2
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

INPUT="$1"

if [ ! -f "$INPUT" ]; then
    echo "Error: input file not found: $INPUT" >&2
    exit 1
fi

if [ $# -ge 2 ]; then
    OUTPUT="$2"
else
    DIR=$(dirname -- "$INPUT")
    BASE=$(basename -- "$INPUT")
    NAME="${BASE%.*}"
    OUTPUT="${DIR}/${NAME}_esp32.wav"
fi

if [ $# -ge 3 ]; then
    SAMPLE_RATE="$3"
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "Error: ffmpeg not found. Install it with: brew install ffmpeg" >&2
    exit 1
fi

echo "Converting:"
echo "  input:       $INPUT"
echo "  output:      $OUTPUT"
echo "  format:      16-bit PCM, mono, ${SAMPLE_RATE} Hz WAV"
echo

ffmpeg -y -i "$INPUT" \
    -ar "$SAMPLE_RATE" \
    -ac 1 \
    -sample_fmt s16 \
    -c:a pcm_s16le \
    -fflags +bitexact -flags:a +bitexact \
    "$OUTPUT"

SIZE=$(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT" 2>/dev/null || echo "?")

echo
echo "Done: $OUTPUT ($SIZE bytes)"

if [ "$SIZE" != "?" ] && [ "$SIZE" -gt "$AUDIO_PARTITION_BYTES" ]; then
    echo
    echo "WARNING: output is larger than the ${AUDIO_PARTITION_BYTES}-byte" \
         "'audio' partition (partitions.csv). It will not fit as-is —" \
         "trim the source or lower the sample rate."
fi
