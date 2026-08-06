# ESP32 WAV Downloader & Player

A small **ESP-IDF** firmware for the **ESP32** that, on boot, connects to WiFi, downloads a
`.wav` file over HTTPS, stores it in on-board flash, and plays it out over **I2S** to a
**MAX98357A** class-D amp.

```
 ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌───────────────┐
 │  WiFi    │──▶│ HTTPS    │──▶│ SPI flash  │──▶│  I2S out      │
 │  connect │   │ download │   │ partition  │   │  (MAX98357A)  │
 └──────────┘   └──────────┘   └────────────┘   └───────────────┘
```

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
