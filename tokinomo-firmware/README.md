# Tokinomo device firmware (ESP32-S3)

FreeRTOS firmware for the Tokinomo shelf unit: an **LD2410 mmWave** sensor
detects a shopper, the device **performs** (servo gesture + WS2812B pulse +
I²S audio line), then **cools down** — and reports every step to the cloud over
MQTT. Built to the spec in
[`team/ELECTRONICS_ARCHITECTURE.md`](../team/ELECTRONICS_ARCHITECTURE.md) and
speaking the backend's MQTT contract (`IngestionWorker` / `CommandPublisher`).

```
IDLE → DETECTED → (dwell measured) → PERFORM → COOLDOWN → IDLE
```

---

## Hardware (from §2)

| Subsystem | Part | Pins (config.h) |
|-----------|------|-----------------|
| MCU | ESP32-S3 N16R8 | — |
| Presence | LD2410 mmWave (UART) | RX 18 / TX 17 @ 256000 |
| Audio | MAX98357A (I²S) | BCLK 15 / LRCLK 16 / DIN 7 |
| Motion | Micro servo (5V rail) | PWM 4 |
| Light | WS2812B ×8 | DATA 5 |
| Provision | Button (hold on boot) | GPIO0 |
| Status | LED | GPIO2 |

> Power the servo from the **5V rail with a ~1000 µF bulk cap**, not 3V3, or its
> current spike will brown out the ESP mid-audio (§2.2 / §10).

## Firmware layout (§3.2)

```
src/
├─ main.cpp            # boot, NVS identity/config, queues, task wiring
├─ config.h            # pins, thresholds, defaults, identity fallback
├─ contract.h          # MQTT message shapes (shared)
├─ app.h               # globals, queues, publish/ack helpers
├─ net/                # wifi_provision · mqtt_client · ota
├─ sensors/            # ld2410
├─ actuators/          # servo · leds
├─ audio/              # player (I²S WAV from LittleFS)
├─ logic/              # interaction (state machine + command dispatch)
└─ telemetry/          # reporter (30 s heartbeat)
data/  active.wav      # default clip flashed to LittleFS
```

Six FreeRTOS tasks — `net`, `audio`, `sense`, `logic`, `telem`, `ota` —
communicate over queues so a Wi-Fi stall never freezes the interaction (§10).

---

## 1. Install the toolchain (PlatformIO)

You have the hardware but no toolchain yet — PlatformIO is the fastest path:

1. Install **VS Code**, then the **PlatformIO IDE** extension.
2. Install the **USB-serial driver** for your board if the port doesn't appear
   (ESP32-S3 DevKits usually enumerate natively over the native-USB port).
3. Open this `tokinomo-firmware/` folder in VS Code. PlatformIO reads
   `platformio.ini` and downloads the toolchain + all `lib_deps` on first build.

CLI equivalents (PlatformIO Core): `pio run` build · `pio run -t upload` flash ·
`pio run -t uploadfs` flash LittleFS · `pio device monitor` serial.

## 2. Bring up the backend + broker

From `tokinomo-backend`:

```bash
pnpm docker:up          # postgres, redis, minio, emqx
pnpm prisma:deploy
pnpm seed:platform
pnpm start:dev
```

EMQX dashboard: `http://localhost:18083` (admin / public). Broker: port 1883.

## 3. Provision this device

Register the serial and assign it to a tenant (needs a PLATFORM-role session —
use the admin UI, or add your auth cookie/header to these calls):

```bash
# returns { id, provisionToken }
curl -X POST http://localhost:3000/devices/provision \
  -H 'Content-Type: application/json' \
  -d '{"serial":"ESP32-TEST-01"}'

# assign -> device becomes OFFLINE, ready for traffic
curl -X POST http://localhost:3000/devices/<DEVICE_ID>/assign \
  -H 'Content-Type: application/json' \
  -d '{"tenantId":"<TENANT_ID>"}'
```

The returned device **`id`** (a CUID) is what the firmware must use as its
`DEVICE_ID` — topics are keyed by the DB id, not the serial.

## 4. Configure identity

Two ways to give the board its identity:

- **Quick (bench):** edit the `DEFAULT_*` values in
  [`src/config.h`](src/config.h) — `MQTT_HOST` (the **LAN IP** of the docker
  host, *not* `localhost`), `TENANT_ID`, `DEVICE_ID`.
- **Proper (NVS):** leave config.h alone and write the `tokinomo` NVS namespace
  keys at runtime (`serial`, `tenant`, `device`, `mqttHost`, `mqttPort`,
  `mqttUser`, `mqttPass`). NVS wins over the defaults, so re-flashing firmware
  never clobbers a provisioned identity.

## 5. Flash

```bash
pio run -t uploadfs     # 1) LittleFS image (active.wav) — do this first
pio run -t upload       # 2) firmware
pio device monitor      # 115200 baud
```

**Wi-Fi onboarding:** on first boot (or hold **GPIO0** during reset) the device
opens a `Tokinomo-Setup` Wi-Fi AP → connect, pick the shop SSID + password →
saved to NVS. Without the button it auto-connects with stored credentials.

## 6. Verify the loop

- **EMQX → Clients:** the `DEVICE_ID` is connected.
- **Backend logs:** `IngestionWorker` lines as status/telemetry/events arrive.
- **API:** `GET /devices` shows `ONLINE` + fresh `lastSeen`; wave at the sensor
  and `GET /devices/:id` lists `DETECTION` → `DWELL` → `PLAY` events.
- **Frontend:** the device's live tile updates over the socket.io feed.
- **Audio OTA:** push a clip from the app → serial shows `[ota] audio swapped OK`
  and the backend receives a real `ack`.

---

## MQTT contract (§4) — what this firmware speaks

| Dir | Topic | Payload |
|-----|-------|---------|
| pub | `…/status` | `{"v":1,"status":"online","fw":"1.0.0","ts":…}` (retained + LWT offline) |
| pub | `…/telemetry` | `{"v":1,"ts":…,"rssi":…,"uptime_s":…,"free_heap":…,"fw":…}` |
| pub | `…/event` | `{"v":1,"ts":…,"type":"detection\|dwell\|play",…}` |
| pub | `…/ack` | `{"id":…,"ok":true,"type":"audio_update","version":…}` |
| sub | `…/cmd` | `audio_update` · `play` · `config` · `reboot` |

- **QoS 1** for events/commands; **status retained** for presence.
- **Offline tolerance:** outbound messages sit in a RAM ring buffer
  (`OUTBOUND_QUEUE_LEN`) and flush on reconnect; oldest is dropped when full.
- **Large payloads never cross MQTT:** `audio_update` carries an HTTPS URL +
  `sha256` checksum; the OTA task downloads to LittleFS, verifies, and swaps.

---

## Backend gaps this firmware surfaces

These live on the **backend**, out of scope for this folder, but you'll hit them
when testing:

1. **Fake acks.** `AudioService.push` calls `publishAudioCommands(..., { simulateAck: true })`
   — the backend fabricates an ack ~400 ms later. Set `simulateAck: false` in
   `tokinomo-backend/src/modules/audio/audio.service.ts` so **this device's**
   real ack is the one recorded.
2. **Only `audio_update` is emitted.** The firmware handles `play` / `config` /
   `reboot`, but `CommandPublisher` only ever sends `audio_update`. Add a
   command-send path (e.g. `POST /devices/:id/command`) to exercise them.
3. **`tenantId` trusted from the topic.** `IngestionWorker` writes the topic's
   tenantId onto the device row — publish only under this device's assigned
   tenant, and treat verifying deviceId↔tenantId as a backend fix.
4. **No device MQTT auth/ACL yet.** EMQX is anonymous in dev (`MQTT_USER/PASS`
   blank). Fine on a trusted LAN; add per-device serial+token + ACLs before a
   pilot (§4 assumes this).

---

## Testing checklist (§8)

- **Bench:** each subsystem alone — sensor reads, servo sweep, LED pulse, audio play.
- **Integration:** full loop; confirm audio doesn't brown out on servo move (bulk cap).
- **Resilience:** kill Wi-Fi mid-perform + power-cycle → buffered events flush, device re-registers `online` (LWT flips it offline while down).
- **Soak:** run for hours; watch `free_heap` in telemetry for leaks.
