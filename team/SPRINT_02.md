# Sprint 02 — Engage Bot Pilot Readiness

**Dates:** Thursday, August 6 → Tuesday, August 11, 2026
**Goal:** Everything except real presence-detection proven end-to-end —
backend + dashboard + firmware loop working via a manual/simulated trigger —
so the sensor swap is a same-day integration, not a new sprint.
**Teams:** Software (Backend, Frontend), Electronics (esp_audio)

---

## The blocker

The **HLK-LD116s** 24 GHz mmWave sensor is held at Nepal customs, ETA up to a
week (~Aug 13) — **after** this sprint ends. It's also not the part
[ELECTRONICS_BOM.md](ELECTRONICS_BOM.md) / [ELECTRONICS_ARCHITECTURE.md](ELECTRONICS_ARCHITECTURE.md)
assume (HLK-LD2410) — protocol/driver work needs to start from the datasheet,
not from the existing `ld2410` library assumption.

**Everything else is unblocked.** The gear motor + driver + limit switches + WS2812 LEDs are locally sourced
(not stuck in customs). MQTT, backend, and dashboard are pure software,
testable today via **Simulate** on `/admin/devices` — no firmware required.

**Work order for this sprint: Backend → Frontend → esp_audio.** Backend ships
the generic command path first since esp_audio's `cmd` dispatch work and the
dashboard's "send a real command" UI both build against it.

---

## 1. Backend (`engage-bot-backend`) — do first

Nothing here is hardware-blocked.

- [ ] Generic command-send path — `CommandPublisher` only emits `audio_update`
      today; add `play` / `config` / `reboot` per [CONTRACTS.md](CONTRACTS.md) §①
      so esp_audio and the dashboard have something real to test against.
- [ ] Close the `tenantId`-trusted-from-topic gap in `IngestionWorker` (cross-tenant
      reassignment risk).
- [ ] Stand up per-device MQTT auth + EMQX ACL (Contract ④) — needed before any
      bench unit touches the shared broker.
- [ ] Gate `simulateAck: true` off automatically once a device is actually
      assigned/online (fine to leave on until then).
- [ ] Commit the billing / member-cap / WAV-validation work already sitting
      uncommitted so Frontend builds against a stable API.
- [ ] **Flag for Electronics:** `MAX_AUDIO_BYTES` bumped 512KB→4MB in code, but
      CONTRACTS.md §③ still says ~512KB max — reconcile.
- [ ] Confirm `engage-bot-backend/Dockerfile` builds clean (Coolify smoke test).

## 2. Frontend (`engage-bot-frontend`) — do second

Also fully decoupled from hardware — test via Simulate.

- [ ] Finish the in-flight visual overhaul (hero-scene, site-chrome, app-shell,
      fleet-charts) to a stable, shippable state.
- [ ] Wire `accept-invite` + Users page against the 3-member cap (disable/explain
      at cap, surface the 4th-invite error).
- [ ] Run [TEST_CHECKLIST.md](TEST_CHECKLIST.md) top to bottom — designed to need
      zero firmware (everything via `/admin/devices` → Simulate).
- [ ] Validate the new `Dockerfile` builds (checklist §9).
- [ ] Confirm analytics/fleet charts refresh after a Simulate loop.

## 3. esp_audio — do third

Current state: WiFi → HTTPS download → I2S playback works. An uncommitted
`mqtt_ctl` component already does real Contract-① work (connects, subscribes
to `cmd`, handles `audio_update`, publishes `ack`, publishes `status:online`).

- [ ] Telemetry publish (`rssi` / `uptime_s` / `free_heap` every ~30s).
- [ ] LWT + retained `status` (broker session config).
- [ ] Extend `cmd` dispatch to `play` / `config` / `reboot` (needs Backend's
      command-send path above to test against).
- [ ] Publish `event: play` after a clip finishes.
- [ ] Gear motor (H-bridge driver + limit switch homing) + WS2812 actuator drivers, bench-tested standalone.
- [ ] **Interaction state machine**
      (`IDLE → DETECTED → PERFORM → COOLDOWN → IDLE`) built against a **fake
      trigger** (boot-button press or a test MQTT `cmd`) standing in for
      "presence detected." Swap the trigger source when the sensor arrives —
      zero rework elsewhere.
- [ ] Research the **HLK-LD116s** protocol/datasheet now so the driver is
      written and waiting, not started cold on arrival.
- [ ] Confirm `aud_player.c` requires mono/16-bit/16kHz (matches what Backend
      now validates on upload).

---

## Sequencing

1. **Fri:** Backend ships the generic command endpoint → unblocks esp_audio
   dispatch testing and gives Frontend something real to call.
2. **Fri–Sat:** Frontend finishes the visual pass + runs the checklist against
   Simulate; esp_audio starts telemetry/event/actuator work in parallel.
3. **Weekend–Mon:** esp_audio builds the interaction state machine against a
   fake trigger; someone reads the LD116s datasheet.
4. **Mon:** Full loop demo — dashboard → command → esp_audio → ack →
   dashboard, triggered manually instead of by real presence.
5. **Tue:** Everything provably working except the radar; LD116s swap-in is a
   single afternoon once it clears customs, not a new sprint.

## Definition of done for Sprint 02

- [ ] Backend: command path (play/config/reboot), tenant-trust fix, MQTT ACL,
      billing/member-cap/WAV-validation merged, Dockerfile builds.
- [ ] Frontend: visual overhaul stable, member-cap UI wired, full checklist
      passes, Dockerfile builds.
- [ ] esp_audio: telemetry + full `cmd` dispatch + actuators + state machine
      demoed via fake trigger; LD116s driver written against the datasheet
      (untested on real hardware).
- [ ] Go/no-go note on whether the real sensor demo slips past Tuesday
      (expected: yes, ~Aug 13).
