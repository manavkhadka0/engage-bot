# Engage Bot × Xtreme — Master Document

> Everything in one place: proposal, technical data, electronics BOM, team plan,
> and a slide-by-slide presentation layout. Hand this to a design tool to
> produce the deck, or to a stakeholder as the written proposal.

**Project:** Engage Bot-style shelf-advertising robot
**Client:** Xtreme (energy drink, Nepal)
**By:** Baliyo Ventures — Flexi product line
**Commitment:** 100 units
**First deployment:** a major supermarket *(confirm name)*
**Lead:** Manav
**Prototype sprint:** Sun 26 Jul → Fri 31 Jul 2026

---

## Table of contents
1. [Executive proposal](#1-executive-proposal)
2. [Product vision](#2-product-vision)
3. [Feasibility](#3-feasibility)
4. [Hardware decisions & rationale](#4-hardware-decisions--rationale)
5. [Power system](#5-power-system)
6. [Enclosure](#6-enclosure)
7. [Software & SaaS architecture](#7-software--saas-architecture)
8. [Recurring-revenue model](#8-recurring-revenue-model)
9. [Electronics BOM](#9-electronics-bom)
10. [Prototype-first approach](#10-prototype-first-approach)
11. [Team responsibilities & stack ownership](#11-team-responsibilities--stack-ownership)
12. [Sprint 01 plan](#12-sprint-01-plan)
13. [Presentation layout (slide by slide)](#13-presentation-layout-slide-by-slide)
14. [Open questions](#14-open-questions)

---

## 1. Executive proposal

Xtreme has committed to **100 shelf-advertising robots** — Baliyo Ventures'
largest hardware deployment to date. A Engage Bot-style device grips a product on
a store shelf and makes it **move, light up, and speak**, capturing shopper
attention at the point of purchase (proven to lift sales meaningfully for FMCG
brands).

The strategic decision at the heart of this project: **do we ship 100 "black
boxes" we never see again, or 100 connected devices we can see, measure, and
update remotely?** We are choosing the latter. By adding a lightweight software
layer, each device reports its activity and health to a central **multi-tenant
SaaS platform**, and audio can be pushed to any unit over the air.

This converts a one-time hardware sale into a **renewable, data-backed
relationship** — we can show Xtreme real engagement numbers, push event-themed
audio, and expand the same platform to other brands. The engineering approach is
deliberately disciplined: prove 4–5 units on matrix board before committing to a
PCB run, controlling cost and risk.

---

## 2. Product vision

**From a shelf novelty to a managed fleet product.**

- Every device reports: people detected, interactions, audio plays, and
  online/offline status.
- **mmWave** presence sensing measures **dwell time**, unlocking adaptive
  interactions — e.g. a different audio clip when a shopper lingers.
- We prove value with **real numbers, not promises** — the difference between
  being a vendor and a strategic partner.
- One platform, many brands: onboard Xtreme today, others tomorrow.

---

## 3. Feasibility

**Technical:** All components are proven, off-the-shelf parts (ESP32-S3, mmWave
module, planetary gear motor + driver, I²S audio amp, Li-ion power). The main integration risk —
running audio + Wi-Fi + motor + sensor concurrently on one MCU — is exactly what
the matrix-board phase de-risks.

**Economic:** Per-unit BOM is validated on the 4–5 prototype units before any
PCB commitment. The two biggest cost variables are the **mmWave sensor** and the
**battery pack**. *(Fill per-unit cost once quotes are in.)*

**Operational:** Wi-Fi-only connectivity (no SIM) keeps recurring cost low; the
first site is a supermarket with Wi-Fi. PCB sourcing starts local (first 5),
with the remaining 95 decided after validation.

---

## 4. Hardware decisions & rationale

| Component | Decision | Why |
|---|---|---|
| **Processor** | ESP32-S3 (N16R8: 16 MB flash, 8 MB PSRAM) | Wi-Fi + audio decode + motor + sensor all at once. More RAM/PSRAM than classic ESP32; 16 MB onboard flash may remove the need for a separate audio-storage chip. |
| **Presence sensor** | mmWave (HLK-LD116s, 24 GHz — sourcing) | Detects a **stationary** shopper → measures dwell time. Immune to light/heat/dust. Gives distance + motion data, not just yes/no. |
| **Audio** | MAX98357A I²S DAC+amp + speaker | Clean digital audio straight from the ESP32 with minimal parts. |
| **Motion** | Planetary gear DC motor + H-bridge motor driver + limit switch(es) | More torque/precision than a hobby servo; limit switches give a hard, repeatable home/end-stop instead of relying on PWM position. |
| **Light** | WS2812B addressable LEDs | Individually controllable colour/animation for an attention effect; can later sync with dwell + audio. |
| **Connectivity** | Wi-Fi only (no SIM) | First site has Wi-Fi; SIM cost per unit is too high at 100 units. |
| **Audio storage** | Onboard 16 MB flash (external SPI flash optional) | Enough for one clip + several more; add external chip only if the library grows. |

### Why mmWave over PIR / ultrasonic (team pitch)
- **PIR** only senses motion — a shopper standing still "disappears"; also false-triggers on distant passers-by.
- **Ultrasonic** gives a distance threshold but is narrow-beam and can misfire off certain surfaces.
- **mmWave** detects stationary presence, measures **dwell time**, and is unaffected by lighting, temperature, or dust — directly enabling adaptive interactions and richer analytics.
- **Trade-off accepted:** higher unit cost and a UART (not single-pin) integration. Fair for a product whose whole value is interaction quality.

---

## 5. Power system

Battery-powered, with mains charging so a unit runs through a power cut and
isn't tied to a free shelf outlet.

```
AC adapter → CC/CV charger → BMS → 2S 18650 pack → buck regulator → 5V / 3.3V
 (wall)                     (protect+balance)      (step-down)       rails
```

- **Battery:** 2S Li-ion (2× or 4× 18650), 7.4 V nominal — headroom for motor current spikes + runtime.
- **BMS:** 2S protection (over-charge / over-discharge / short / balance).
- **Charger:** CC/CV 2S (8.4 V) module fed from the AC adapter.
- **Regulation:** buck to a clean 5 V rail; ESP32-S3 board LDO handles 3.3 V.
- **Watch-out:** motor current spikes (esp. stall against a limit switch) — a **bulk capacitor** (≈1000 µF) on the 5 V rail keeps audio/Wi-Fi from browning out.

---

## 6. Enclosure

- **Prototype:** 3D-printed — **PETG** preferred (tougher, more heat-tolerant than PLA).
- **100-unit run (decide after validation):**

| Method | Best for | Notes |
|---|---|---|
| Higher-grade 3D print (SLS/MJF nylon) | 100 units, no tooling | Durable, clean finish, no mould cost — likely the sweet spot. |
| Vacuum forming | Outer shells | Cheap tooling; weak for precise mounts. |
| Resin/silicone casting | Small batches | Low tooling; labour-heavy. |
| Injection moulding | High volume | Best unit cost **but** high steel-tool cost — not worth it at only 100. |

**Recommendation:** PETG prototype → **MJF/SLS nylon** for the 100 units unless a
quote says otherwise. Hold injection moulding for a future large order.

---

## 7. Software & SaaS architecture

Delivered as a **multi-tenant SaaS platform** so Baliyo can onboard Xtreme now
and other brands later, each seeing only their own fleet.

```
[ESP32-S3 device] --MQTT--> [Backend / NestJS] <--HTTPS--> [SaaS dashboard]
  mmWave                      device registry                fleet list/map
  gear motor + driver         telemetry store                health status
  audio (flash)               audio push API                 remote audio upload
  WS2812 LEDs                 tenant isolation                role-based access
```

1. **Device firmware (ESP32-S3)** — presence + dwell logic, gear-motor motion, audio
   playback, LED effects, and cloud comms over **MQTT** (lightweight device↔cloud
   protocol; online/offline status essentially for free).
2. **Backend (NestJS)** — multi-tenant device registry + telemetry (interaction
   counts, audio plays, online/offline transitions, dwell events) + audio-upload
   endpoint (push a clip to one device or all).
3. **Web dashboard (SaaS)** — fleet list/map, per-device health + stats, remote
   audio upload for event theming, role-based access per tenant.

**Benefit to Baliyo:** visibility (know a unit is down before the client
complains), a data story for renewals, and a reusable platform across brands.
**Cost of not doing it:** 100 black boxes with zero visibility, and the sale
stays a one-time transaction.

---

## 8. Recurring-revenue model

- **Base tier:** one audio clip per device.
- **Higher tier:** multiple clips + event theming, pushed remotely.
- **Analytics + remote updates** justify a subscription — turning one-time
  hardware into renewable income.
- Architecture supports many clips from day one — it's a **provisioning/billing
  switch, not a rebuild**.

---

## 9. Electronics BOM

Per **one** device. Sourcing for Nepal / Kathmandu: **Local** = Kathmandu shops
or Daraz; **Import** = AliExpress / India (carry spares, longer lead time).

### Non-optional core
| Item | Suggested part | Qty | Purpose | Sourcing |
|---|---|---|---|---|
| Main MCU | ESP32-S3 DevKit **N16R8** (16 MB flash, 8 MB PSRAM) | 1 | Wi-Fi, audio, motor + sensor control | Import |
| mmWave sensor | HLK-LD2410 (24 GHz, UART) | 1 | Presence + dwell time | Import |
| Audio amp | MAX98357A (I²S DAC+amp) | 1 | Decode + amplify audio | Import |
| Speaker | 4 Ω / 8 Ω, 3 W | 1 | Sound output | Local |
| Gear motor | Planetary gear DC motor (TBD) | 1 | Move / grip product | Local/Import |
| Motor driver | H-bridge — e.g. TB6612FNG / L298N / DRV8833 (confirm) | 1 | Drive the gear motor | Local/Import |
| Limit switch | Micro limit switch, SPDT | 1–2 | Home / end-stop | Local |
| Bulk capacitor | 1000 µF electrolytic | 1 | Absorb motor current spikes | Local |
| Battery | 18650 Li-ion, 2S (opt. 2S2P) | 2–4 | Main power | Local |
| BMS | 2S protection board | 1 | Battery safety + balance | Local |
| Charger | CC/CV 2S (8.4 V) module | 1 | Charge from AC | Local/Import |
| AC adapter | 12 V, 2 A | 1 | Mains input | Local |
| Buck regulator | MP1584 / LM2596 → 5 V | 1 | Clean 5 V rail | Local |
| Battery holder | 18650 (2S) | 1 | Hold cells | Local |
| Perfboard, wires, connectors, passives, switch | — | set | Prototype build | Local |

### Optional / value-add
| Item | Suggested part | Qty | Purpose | Sourcing |
|---|---|---|---|---|
| Addressable LEDs | WS2812B (few pixels / short strip) | 1 | Light-up attention effect | Local |
| External SPI flash | 16–32 MB NOR + LittleFS | 0–1 | Extra audio storage **only if** onboard 16 MB isn't enough | Import |

### Import first (with spares)
ESP32-S3 N16R8 · HLK-LD2410 mmWave · MAX98357A · (optional external SPI flash) —
these are the long-lead / not-reliably-local items; order on Day 1.

### Cost note
Total the BOM across the 5 prototype units to inform the go/no-go and the
per-unit price quoted to Xtreme (base = 1 clip; +clips = higher tier). Biggest
cost variables: **mmWave** and **battery pack**.

---

## 10. Prototype-first approach

- Build the first **4–5 units on matrix board**, not PCB.
- Prove mmWave + audio + gear motor integration works reliably in real shelf conditions.
- Only after validation commit to PCBs: **first 5 sourced locally**, remaining
  **95 later** (local or overseas — TBD).
- **Why:** re-spinning a PCB after ordering 100 would be a costly setback. This
  protects budget and timeline while keeping quality high.

---

## 11. Team responsibilities & stack ownership

| Team | Owns | Day-1 responsibility |
|---|---|---|
| **Electronics / Hardware** | Firmware (ESP32-S3) + the circuit; matrix-board build → PCB | **Gather every component** so prototyping can start |
| **Mechanical** | Enclosure + physical design; mount for arm/sensor | 3D-print concept sized to Xtreme's bottles/cans |
| **Software** | NestJS backend + multi-tenant SaaS dashboard; MQTT + audio push | Define data model + backend skeleton |

---

## 12. Sprint 01 plan

**Dates:** Sun 26 Jul → Fri 31 Jul 2026.
**Goal:** one working prototype (detect → dwell → move → speak → logged) + a live
dashboard, and a documented go/no-go on PCB design.

| Day | Mechanical | Electronics | Software |
|---|---|---|---|
| **Sun 26 — Kickoff** | Review shelf-robot designs; sketch enclosure | Confirm all components ordered / in hand | Define data model; backend skeleton |
| **Mon 27 — Bring-up** | Draft first enclosure | ESP32-S3 on Wi-Fi; read mmWave raw data | Device check-in → reports online |
| **Tue 28 — Audio+sensor** | Iterate enclosure to fit parts | Play audio off flash; tune dwell detection | Upload endpoint → push clip to one device |
| **Wed 29 — Motion+logic** | Finalize arm/sensor mount | Wire motor driver + limit switches; full loop on one unit | First dashboard view (devices + last interaction) |
| **Thu 30 — Multi-unit** | Assemble 2 more units | Replicate across 4–5 units; stress-test Wi-Fi | Multi-device dashboard; verify targeted audio push |
| **Fri 31 — Review** | Demo | Demo full loop | Demo dashboard · document cost/reliability · **go/no-go** |

### Definition of done
- [ ] One unit runs the full loop reliably.
- [ ] 4–5 matrix-board units built and stress-tested.
- [ ] Dashboard shows live status + last interaction.
- [ ] Remote audio push verified to a specific device.
- [ ] Per-unit cost + reliability documented.
- [ ] Go/no-go recorded.

---

## 13. Presentation layout (slide by slide)

> 11 slides, geometric/professional style. Each slide: **on-slide content** +
> **image suggestion** + **speaker note**. Use this as the deck build spec.

### Slide 1 — Engage Bot × Xtreme *(title)*
- **On slide:** Title "Engage Bot × Xtreme" · Subtitle "From a shelf novelty to a managed fleet product" · "Xtreme has committed 100 units — our biggest hardware deployment yet" · "Led by Manav — Baliyo Ventures, Flexi product line"
- **Image:** retail shelf with energy drinks / a small robotic shelf device
- **Speaker note:** Set the tone — this is a product launch, not a gadget order.

### Slide 2 — The Opportunity: the Fork in the Road
- **On slide:** Shelf robots grip a product and make it move, light up, speak — proven to lift attention & sales · Xtreme promised 100 units, starting at a major supermarket · The fork: **100 black boxes** vs **100 connected devices** · This choice defines one-time sale vs recurring product
- **Image:** shopper looking at a supermarket shelf
- **Speaker note:** Land the strategic decision before the vision.

### Slide 3 — The Vision: A Managed Fleet, Not a Black Box
- **On slide:** Every device reports people detected, interactions, audio plays, online/offline · mmWave dwell time → adaptive interactions · Prove value with real numbers · Vendor → strategic partner
- **Image:** fleet dashboard / connected devices on a map
- **Speaker note:** This is the leadership thesis of the whole project.

### Slide 4 — Why Software: SaaS + Recurring Revenue
- **On slide:** Three layers — ESP32-S3 firmware, NestJS backend, multi-tenant SaaS dashboard · MQTT gives online/offline nearly free · Base tier = 1 clip, higher tier = multi-clip + event theming · Multi-tenant → onboard Xtreme now, other brands later
- **Image:** cloud / SaaS / subscription concept
- **Speaker note:** Explain why a hardware project needs software and how Baliyo profits.

### Slide 5 — Electronics Architecture at a Glance
- **On slide:** ESP32-S3 hub (Wi-Fi + audio + sensor + motor) · mmWave over UART · planetary gear motor (driver + limit switches) grips/moves · I²S amp + speaker · addressable LEDs · battery + BMS + AC charging · device→cloud over MQTT
- **Image:** clean block-diagram of connected modules
- **Speaker note:** One picture of the whole single-robot system.

### Slide 6 — Component Choices — and Why
- **On slide:** ESP32-S3 N16R8 (RAM + 8 MB PSRAM + 16 MB flash; onboard flash may drop the extra chip) · mmWave over PIR/ultrasonic (stationary detection + dwell, immune to light/heat/dust) · MAX98357A I²S audio · planetary gear motor via H-bridge driver + limit switches (more torque/precision than a hobby servo)
- **Image:** microcontroller board + radar/mmWave module + gear motor + driver
- **Speaker note:** Build team confidence in each decision.

### Slide 7 — Addressable LEDs: Small Part, Big Effect
- **On slide:** WS2812B — individually controllable colour/animation · Use case: attention effect on a crowded shelf · Future: sync with dwell + audio · Cheap, local, low-effort — high impact · Optional but recommended for demo impact
- **Image:** glowing WS2812/RGB LED pixels
- **Speaker note:** Answer why we're adding LEDs and what they buy us.

### Slide 8 — Power System: Battery, BMS & AC Charging
- **On slide:** Battery-powered — not tied to a shelf outlet · AC → charger → BMS → 2S 18650 → buck → 5V/3.3V · BMS protects + balances · Runs through a power cut (like a small UPS) · Bulk capacitor stops motor brown-outs
- **Image:** 18650 batteries with a BMS board
- **Speaker note:** Show the power reasoning is deliberate and safe.

### Slide 9 — Prototype First: Matrix Board Before PCB
- **On slide:** First 4–5 units on matrix board · Prove mmWave + audio + gear motor in real conditions · Then PCBs — first 5 local, 95 later · Re-spinning after 100 = costly setback · Protects budget & timeline
- **Image:** breadboard/perfboard prototype next to a finished PCB
- **Speaker note:** Signals disciplined engineering to the team and client.

### Slide 10 — Optional vs Non-Optional Parts
- **On slide (two columns):**
  - *Non-optional:* ESP32-S3 N16R8, mmWave, MAX98357A + speaker, gear motor + driver + limit switches, battery + BMS, charger, buck
  - *Optional:* external SPI flash (if onboard 16 MB isn't enough), WS2812B LEDs
  - *Import first:* ESP32-S3, mmWave, audio amp · *Local:* gear motor, motor driver, limit switches, speaker, 18650, BMS, charger, buck, perfboard, passives
- **Image:** two-column checklist visual
- **Speaker note:** Give the buy team a clear priority.

### Slide 11 — Team Responsibilities & Day 1
- **On slide:** Electronics/Hardware → firmware + circuit; **Day 1: gather all components** · Mechanical → enclosure (3D-print first) · Software → NestJS backend + SaaS dashboard · Sprint 01: Sun 26 → Fri 31 Jul, ends in prototype demo + go/no-go · **"We are not selling a device, we are launching a product."**
- **Image:** teamwork / engineering kickoff
- **Speaker note:** Assign ownership, set the immediate action, close on momentum.

---

## 14. Open questions

- [ ] Confirm the supermarket name for the first deployment.
- [ ] Per-unit BOM ceiling / target cost (fill after quotes).
- [ ] Battery capacity / runtime target → size the 18650 pack.
- [ ] Scale enclosure method (MJF/SLS vs vacuum-form vs cast).
- [ ] Shelf mounting method (clamp / adhesive / bracket)?
- [ ] Audio spec: max length + format for the single clip.
- [ ] Overseas PCB house for the 95 (JLCPCB/China vs local)?
