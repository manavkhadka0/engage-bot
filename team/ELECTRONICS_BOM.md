# Electronics BOM — Engage Bot (per unit)

Parts for **one** device. Sourcing is for Nepal / Kathmandu:
- **Local** = available in Kathmandu electronics shops or Daraz.
- **Import** = order from AliExpress / India (Robu) — carry spares, longer lead time.

> **Board + sensor update (2026-08-17):** superseded the original ESP32-S3 N16R8 /
> HLK-LD2410 plan below with the **DFRobot FireBeetle 2 ESP32-UE (N16R2)** (classic
> ESP32) and **HLK-LD116S** (evaluating against RCWL-0516 as a cheap fallback) — see
> [`INTERN_FIRMWARE_TASKS.md`](INTERN_FIRMWARE_TASKS.md) for the bring-up validating
> this. Motor driver is now confirmed: **HW-166**, a TB6612FNG breakout.

> **Prototype phase:** buy enough for **5 units + spares** (mmWave, MCU, DAC, and
> flash are the risky/import items — order extras of these first).

---

## Compute

| # | Item | Suggested part | Qty | Purpose | Sourcing |
|---|---|---|---|---|---|
| 1 | Main MCU | **DFRobot FireBeetle 2 ESP32-UE (N16R2 — 16 MB flash, 2 MB PSRAM)** | 1 | Wi-Fi, audio, motor + sensor control | Already have |
| 2 | External SPI flash *(optional)* | 16–32 MB NOR flash + LittleFS | 0–1 | Extra audio storage **only if** onboard 16 MB isn't enough | Import |

> **Note:** the N16R2 already has **16 MB onboard flash** (the custom partition table
> in `esp_audio/partitions.csv` splits it 4 MB app + 10 MB audio storage) — likely
> enough for one clip and room for several more. Add the external chip only if the
> clip library grows.

## Presence detection

| # | Item | Suggested part | Qty | Purpose | Sourcing |
|---|---|---|---|---|---|
| 3 | mmWave sensor | **HLK-LD116S** (24 GHz, presence — confirm exact protocol during bring-up) | 1 | Detect shoppers incl. stationary → dwell time | Import — already ordered, confirm arrival |
| 3b | Doppler motion sensor | **RCWL-0516** | 1 | Cheap comparison/fallback — motion-only, **cannot** detect a stationary shopper (see intern Day 2 findings for the empirical test) | Local |

## Audio

| # | Item | Suggested part | Qty | Purpose | Sourcing |
|---|---|---|---|---|---|
| 4 | I²S DAC + amp | **MAX98357A** | 1 | Decode + amplify audio from the ESP32 | Import — already in use, see `esp_audio/` |
| 5 | Speaker | 4 Ω / 8 Ω, 3 W | 1 | Sound output | Local |

## Motion

| # | Item | Suggested part | Qty | Purpose | Sourcing |
|---|---|---|---|---|---|
| 6 | Gear motor | Planetary gear DC motor (model/torque TBD) | 1 | Move / grip the product | Local/Import |
| 6b | Motor driver | **HW-166** (TB6612FNG, 2-channel — only channel A used) | 1 | Drive the gear motor: AIN1/AIN2 direction + PWMA speed + STBY enable | Local/Import |
| 6c | Limit switch | Micro limit switch, SPDT | 1–2 | Home / end-stop the motor travel | Local |
| 7 | Bulk capacitor | 1000 µF electrolytic | 1 | Absorb motor current spikes on 5 V rail (esp. stall at limit switch) | Local |

## Light effect (optional, cheap)

| # | Item | Suggested part | Qty | Purpose | Sourcing |
|---|---|---|---|---|---|
| 8 | Addressable LED | WS2812B (few pixels or a short strip) | 1 | Light-up attention effect | Local |

## Power

| # | Item | Suggested part | Qty | Purpose | Sourcing |
|---|---|---|---|---|---|
| 9 | Battery | 18650 Li-ion, **2S** (2×, optionally 2S2P for runtime) | 2–4 | Main power | Local |
| 10 | BMS | 2S protection board (balance + protect) | 1 | Battery safety | Local |
| 11 | Charger | CC/CV 2S (8.4 V) charging module | 1 | Charge pack from AC | Local / Import |
| 12 | AC adapter | 12 V, 2 A wall adapter | 1 | Mains input | Local |
| 13 | Buck regulator | MP1584 or LM2596 → 5 V | 1 | Clean 5 V rail | Local |
| 14 | Battery holder | 18650 holder (2S) | 1 | Hold cells | Local |

## Build / misc

| # | Item | Qty | Purpose | Sourcing |
|---|---|---|---|---|
| 15 | Matrix / perfboard | 1 | Prototype circuit (pre-PCB) | Local |
| 16 | Jumper wires + headers | set | Wiring | Local |
| 17 | Connectors (JST etc.) | set | Battery / motor / limit switch / speaker leads | Local |
| 18 | Resistors, caps, LEDs | set | Support components | Local |
| 19 | Switch / power button | 1 | On/off | Local |

---

## Import shortlist (order first, with spares)
These are the long-lead / not-reliably-local items — get them moving on day 1:

1. **HLK-LD116S** mmWave sensors (already ordered — confirm arrival before Week-1
   Day 2 of intern bring-up)
2. **MAX98357A** I²S audio amps
3. (Optional) external **SPI flash** chips

## Locally available (buy as needed)
FireBeetle 2 ESP32-UE boards, RCWL-0516 sensors, gear motors, HW-166 motor drivers,
limit switches, speakers, 18650 cells + holders, BMS, chargers, AC adapters, buck
converters, perfboard, wires, connectors, passives, LEDs, switches.

---

## Cost note
Fill in per-unit BOM cost once quotes are in — **mmWave (HLK-LD116S)** and the
**battery pack** are the two biggest cost variables. Total these across the 5
prototype units to inform the go/no-go and the price you quote Xtreme per unit
(base = 1 clip; +clips = higher tier).
