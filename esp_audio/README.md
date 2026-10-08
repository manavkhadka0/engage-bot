# ESP32 WAV Downloader & Player

A small **ESP-IDF** firmware for the **ESP32** that, on boot, connects to WiFi, downloads a
`.wav` file over HTTPS via MQTT-driven commands from the Engage Bot backend, stores it in
on-board flash, and plays it out over **I2S** to a **MAX98357A** class-D amp. Authenticates
to EMQX per-device (Contract ④) rather than connecting anonymously.

```
 ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌───────────────┐
 │  WiFi    │──▶│ HTTPS    │──▶│ SPI flash  │──▶│  I2S out      │
 │  connect │   │ download │   │ partition  │   │  (MAX98357A)  │
 └──────────┘   └──────────┘   └────────────┘   └───────────────┘
```

## Testing playback in isolation (no WiFi needed)

Before bringing up the full pipeline, `app_main` can be swapped for a ~50-line variant
that skips WiFi/MQTT entirely and just streams whatever WAV is already sitting in the
`audio` flash partition — useful for proving the I2S wiring and amp work with zero
networking variables in the mix. That variant lives in git history on
[`feature/esp-audio-01-play-audio`](../../commits/feature/esp-audio-01-play-audio) (not
on `main`, since it's a bring-up tool rather than the shipped firmware); the flow to put
a clip on the partition manually is:

```bash
. $HOME/esp/esp-idf/export.sh
idf.py set-target esp32
idf.py build                      # also generates the partition table
python $IDF_PATH/components/partition_table/parttool.py \
  --port /dev/tty.usbserial-0001 \
  write_partition --partition-name audio --input hello.wav
idf.py -p /dev/tty.usbserial-0001 flash monitor
```

`hello.wav` (already in this repo) is 16-bit mono — the only format `aud_player`
accepts. `techno.wav` and `test_tone.wav` are also in the repo for a longer/simpler clip.

## Standalone hardware-loop test (current `main.c` — no backend/frontend)

Unlike the isolated-playback variant above, this one **is** the current `main.c` on
this branch — a full PIR → audio+motor+LED → reed-switch → home loop, with WiFi/MQTT
deliberately not wired up. It's for proving the physical loop end-to-end on the bench
before a backend/frontend exist to talk to. Ported from a bench-tested Arduino
(FastLED + ESP32-audioI2S) sketch — see `main/main.c`'s header comment for what
changed in the port (the touch-button flow is gone, freeing GPIO4 for the LED; the
home-timeout safety is now actually enforced, not just defined-and-unused).

**Pin map used by this build:**

| Function | GPIO | Notes |
|---|---|---|
| I²S BCLK / LRC / DIN (MAX98357A) | 26 / 25 / 22 | DIN moved off the proven GPIO17 — verify GPIO22 is actually broken out on your board before flashing |
| PIR sensor | 34 | input-only, no internal pull |
| WS2812B LED data | 4 | touch buttons are gone in this build, so this pin is free |
| Motor AIN1 / AIN2 / PWMA / STBY | 13 / 23 / 14 / 19 | STBY is GPIO-driven here (set HIGH once at boot), not resistor-tied |
| Reed switch (home) | 18 | `INPUT_PULLUP`; LOW = magnet present = home |

**Before building:** flash `techno.wav` onto the `audio` partition — it's the bundled
default clip for this test, no download step:

```bash
. $HOME/esp/esp-idf/export.sh
idf.py set-target esp32
idf.py build
python $IDF_PATH/components/partition_table/parttool.py \
  --port /dev/tty.usbserial-0001 \
  write_partition --partition-name audio --input techno.wav
idf.py -p /dev/tty.usbserial-0001 flash monitor
```

Re-run just the `write_partition` line (no rebuild needed) any time you want to swap
the clip — `idf.py flash` only touches the app partition, it won't overwrite `audio`.

**Expected behavior:** PIR trips (3 consecutive reads) → red/white LED flicker + clip
plays + motor drives forward, reed switch ignored → clip finishes → LED goes green,
motor keeps driving forward, reed switch now active → magnet trips the reed switch →
motor stops, LEDs off → back to waiting. If the reed switch doesn't trip within 10s of
the clip finishing, the motor stops and the device enters a FAULT state (logged) rather
than running the motor indefinitely — reboot to clear it.

**Not done by this build:** WiFi, MQTT, and the touch-button download/play flow from
the networked firmware. Re-integrating those (real backend audio pushes, events over
MQTT) is the deliberate next step once a backend is reachable — the `wifi_manager`,
`downloader`, and `mqtt_ctl` components are untouched and still in this repo for that.

---

## How it works

On startup ([`main/main.c`](main/main.c)):

1. **Mount storage** — LittleFS is mounted on the `storage` flash partition.
2. **Connect WiFi** — station mode, blocks until an IP is acquired.
3. **Download** — fetches `hello.wav` from a GitHub raw URL into the `audio` flash partition.
4. **Play** — streams the WAV's 16-bit PCM samples over I2S to the MAX98357A.

## Project structure

The logic is split into four self-contained ESP-IDF components:

| Component | Source | Responsibility |
|-----------|--------|----------------|
| `filesystem`   | [`components/filesystem/filesystem.c`](components/filesystem/filesystem.c)     | Mount LittleFS on the `storage` partition; read/write self-test |
| `wifi_manager` | [`components/wifi_manager/wifi_manager.c`](components/wifi_manager/wifi_manager.c) | Connect to WiFi in STA mode with auto-reconnect |
| `downloader`   | [`components/downloader/downloader.c`](components/downloader/downloader.c)     | Download a file over HTTPS (`esp_http_client` + cert bundle) |
| `aud_player`   | [`components/aud_player/aud_player.c`](components/aud_player/aud_player.c)     | Read a 16-bit mono WAV and stream it over I2S to the MAX98357A |

```
esp_audio/
├── CMakeLists.txt          # top-level ESP-IDF project
├── partitions.csv          # custom partition table (4M app + 10M storage)
├── main/
│   ├── main.c              # app entry point + orchestration
│   └── idf_component.yml   # component-manager deps (littlefs)
└── components/
    ├── filesystem/
    ├── wifi_manager/
    ├── downloader/
    └── aud_player/
```

## Requirements

- **ESP-IDF v5.0 or newer** (developed against v6.0.2 — see [`dependencies.lock`](dependencies.lock))
- An ESP32 board (this project currently targets the original **ESP32**; I2S is also
  available on the S2/S3/C3 variants, but `sdkconfig` would need `idf.py set-target`).
- A **MAX98357A** I2S class-D amp module wired per the table below, driving a speaker.

Dependencies are pulled automatically by the IDF component manager:
- [`joltwallet/littlefs`](https://components.espressif.com/components/joltwallet/littlefs) — flash filesystem

## Configuration

Before building, set your WiFi credentials in [`main/main.c`](main/main.c):

```c
#define WIFI_SSID      "your-ssid"
#define WIFI_PASSWORD  "your-password"
```

To play a different file, change the URL and destination path in the `download_task`
function of the same file.

## Build & flash

```bash
# 1. Set up the ESP-IDF environment (adjust path to your install)
. $HOME/esp/esp-idf/export.sh

# 2. Select the target and build
idf.py set-target esp32
idf.py build

# 3. Flash and open the serial monitor (replace with your port)
idf.py -p /dev/tty.usbserial-0001 flash monitor
```

Expected serial output:

```
=====================================
 ESP32 WAV Downloader
=====================================
I (xxx) FILESYSTEM: LittleFS mounted
I (xxx) WIFI: Connected. IP: 192.168.x.x
I (xxx) DOWNLOADER: Download Complete
I (xxx) AUD_PLAYER: Playing /storage/hello.wav
I (xxx) AUD_PLAYER: Playback completed
```

### Dev container

A [`.devcontainer`](.devcontainer) with the ESP-IDF toolchain and the ESP-IDF /
ESP-IDF-Web VS Code extensions is included for a ready-to-go build environment.

## Hardware wiring

Board on hand: **DFRobot FireBeetle 2 ESP32-UE (N16R2)**. Its header silkscreen doesn't
print raw GPIO numbers, so pins are given as both:

| Signal        | GPIO   | Board silkscreen | MAX98357A pin |
|---------------|--------|-------------------|----------------|
| BCLK          | GPIO26 | D3                 | BCLK           |
| LRC (WS)      | GPIO25 | D2                 | LRC            |
| DIN           | GPIO17 | D10                | DIN            |
| 3V3           | —      | 3.3V               | VIN, SD        |
| GND           | —      | GND                | GND            |

GPIO27 is **not** broken out on this board's header (neither is GPIO16 — likely
reserved internally for the module's PSRAM), so DIN uses GPIO17/D10 instead.

Tying **SD** to 3V3 keeps the amp always enabled (simplest wiring). If you later want a
click-free power-up or a hardware mute, wire SD to a spare GPIO instead and drive it
high just before playback starts.

Note on power: this board's **VCC** pin is a lightly-regulated pass-through (~4.7V on
USB power, ~4V on LiPo, per DFRobot's own spec — not a firm 5V rail) meant for
low-current sensors, not an audio amp under load. Fine for initial bring-up; if you
still get breakup at higher volume, move the amp's VIN to a proper external supply.

## Touch pin labels (this board)

The firmware's touch pads are GPIO4 (download) and GPIO12 (play) — on a generic ESP32
devkit those are often silkscreened "D4"/"T5", but **on this board they're printed
D12 and D13**:

| Action    | GPIO   | Board silkscreen |
|-----------|--------|--------------------|
| Download  | GPIO4  | D12                |
| Play      | GPIO12 | D13                |

GPIO12 (D13) is still a boot-strapping pin (MTDI) regardless of board — don't touch it
during power-on/reset.

## Known limitations / TODO

- **16-bit mono WAV only.** `aud_player` parses the WAV header properly (arbitrary
  chunk order, correct sample rate/bit depth from the `fmt ` chunk) but rejects
  anything that isn't 16-bit mono PCM — stereo or 8-bit files need to be converted
  before upload.
- **WiFi credentials are hardcoded** in `main.c`. Consider moving them to `menuconfig`
  (Kconfig) or NVS.
- **Partition mismatch:** [`partitions.csv`](partitions.csv) labels the `storage`
  partition subtype as `spiffs`, but the firmware mounts it as **LittleFS**. It works,
  but the label is misleading.
- No download retry / resume, and the played file is not deleted or cached between boots.
