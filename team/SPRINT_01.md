# Sprint 01 — Engage Bot Prototype

**Dates:** Sunday, July 26 → Friday, July 31, 2026
**Goal:** One fully working prototype (detect → dwell → move → speak → logged)
plus a live dashboard, and a documented go/no-go on PCB design.
**Teams:** Mechanical · Electronics · Software

---

## Sun Jul 26 — Kickoff

| Team | Task |
|---|---|
| Mechanical | Review existing shelf-robot designs; sketch rough enclosure sized for Xtreme bottles/cans. |
| Electronics | Confirm all components ordered / in hand: ESP32-S3 boards, mmWave sensors, SPI flash chips, servos. |
| Software | Define data model (device registry + telemetry); set up backend project skeleton. |

## Mon Jul 27 — Core hardware bring-up

| Team | Task |
|---|---|
| Mechanical | Draft first enclosure design. |
| Electronics | ESP32-S3 on Wi-Fi; read raw data off the mmWave sensor. |
| Software | Basic device check-in → device reports itself online. |

## Tue Jul 28 — Audio + sensor integration

| Team | Task |
|---|---|
| Mechanical | Iterate enclosure to fit actual components. |
| Electronics | Play audio off SPI flash; tune mmWave dwell-time detection. |
| Software | Upload endpoint — push an audio file to a single device and test it. |

## Wed Jul 29 — Motion + interaction logic

| Team | Task |
|---|---|
| Mechanical | Finalize first physical mount for arm + sensor. |
| Electronics | Wire servo; full loop on one unit — detect → timer → arm moves → audio plays → logged. |
| Software | First dashboard view — connected devices + last interaction. |

## Thu Jul 30 — Multi-unit testing

| Team | Task |
|---|---|
| Mechanical | Assemble 2 more prototype units. |
| Electronics | Replicate circuit across all 4–5 matrix-board units; stress-test Wi-Fi drop/reconnect. |
| Software | Test dashboard with multiple devices; verify custom audio pushes hit the right device only. |

## Fri Jul 31 — Review + go/no-go

| Team | Task |
|---|---|
| All | Demo full prototype together: detection, motion, audio, live dashboard. |
| All | Document costs + reliability issues. **Go/no-go on PCB design.** Sketch next sprint. |

---

### Definition of done for Sprint 01
- [ ] One unit runs the full loop reliably (detect → dwell → move → speak → logged).
- [ ] 4–5 matrix-board units built and stress-tested.
- [ ] Dashboard shows live device status + last interaction.
- [ ] Remote audio push verified to a *specific* device.
- [ ] Per-unit cost + reliability notes documented.
- [ ] Go/no-go decision recorded.
