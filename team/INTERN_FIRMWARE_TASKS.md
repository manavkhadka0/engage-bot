# Firmware Intern — Week 1 Task List

**Track:** Electronics / Firmware · **Board:** DFRobot FireBeetle 2 ESP32-UE (N16R2)
**Toolchain:** Arduino IDE (ESP32 board package) — **not** the ESP-IDF setup used by
`esp_audio/`. Read [§0](#0-before-you-start) for why, and how your code eventually meets
that codebase.
**Companion docs:** [ELECTRONICS_ARCHITECTURE.md](ELECTRONICS_ARCHITECTURE.md) ·
[ELECTRONICS_BOM.md](ELECTRONICS_BOM.md) · [ARCHITECTURE.md](ARCHITECTURE.md) ·
[`esp_audio/README.md`](../esp_audio/README.md)

> `ELECTRONICS_ARCHITECTURE.md` and `ELECTRONICS_BOM.md` have been updated (2026-08-17)
> to match the current board/sensor/driver — board and MAX98357A pins there now agree
> with this document and with `esp_audio/README.md`.
>
> **Pins finalized (2026-08-18)** — the tables below are no longer "tentative,"
> they're the pin map to build against. What's still Week-1's job to decide is the
> **sensor part** (HLK-LD116S vs. RCWL-0516) — that's a component choice, not a pin
> choice, and doesn't change GPIO34's assignment either way. If Day 2 testing finds
> the sensor genuinely needs a second GPIO (bidirectional UART for config commands),
> stop and flag it — the whole pin budget below assumes it's single-pin only. Update
> all three docs together if anything changes, don't let them drift apart again.

---

## 0. Before you start

**Why Arduino IDE, and not the project's real firmware?** `esp_audio/` (the production
codebase) is ESP-IDF — a heavier, component-based build system. You'll move faster
learning each subsystem in Arduino IDE, which has ready-made libraries for exactly the
parts below. **Your code this week is a set of standalone proof-of-concept sketches, not
the production firmware.** Friday's job is to merge *your three subsystems* into one
sketch and prove the concept works together — porting that into the real ESP-IDF
codebase is a follow-up task with your mentor, not something to do this week.

**Where your code lives** (new folder, separate from `esp_audio/` so the two build
systems never collide):

```
esp_arduino_prototypes/
├── 01_motion_sensor/
│   └── 01_motion_sensor.ino
├── 02_motor_driver/
│   └── 02_motor_driver.ino
├── 03_speaker_playback/
│   └── 03_speaker_playback.ino
└── 04_integration/
    └── 04_integration.ino
```
(Arduino IDE requires a sketch to live in a folder with the same name as the `.ino`
file — create each folder as you reach that day.)

**GPIO ground rules for this board** — read before wiring anything:
- **Already spoken for** by the existing playback firmware — don't reuse: **GPIO26,
  25** (I2S to the amp), **GPIO4, 12** (touch pads). **GPIO22** is also spoken for —
  the amp's I²S DIN is moving there from GPIO17 (decided, not yet flashed; see
  `ELECTRONICS_ARCHITECTURE.md` §2.1).
- **Already spoken for** by this week's finalized pin map (don't reuse for anything
  else): **GPIO32** (WS2812 LED), **GPIO34** (mmWave sensor), **GPIO13, 19, 23**
  (motor driver AIN1/AIN2/PWMA), **GPIO33** (limit switch, home).
- **Not broken out on this board's header at all:** GPIO27, GPIO16. Don't design around
  them even though generic ESP32 tutorials use them.
- **Never use for anything:** GPIO6–11 (wired internally to the board's own flash chip —
  using them will hang or corrupt the board).
- **Avoid unless you have a specific reason:** GPIO0, 1, 2, 3, 5, 12, 15 (boot-strapping /
  USB-serial pins — wrong state at power-on can stop the board from booting or flashing).
- The pins below (§ per-day tables) avoid all of the above. **Still verify against the
  physical board** before soldering anything — D-label silkscreen vs. GPIO number has
  already been wrong once this project (§ esp_audio/README.md GPIO27/16 note; GPIO22
  needs the same check before the DIN move is wired). If a listed pin turns out not to
  be broken out, the remaining free pins are: **GPIO14, 17, 18, 35** (14 and 18 were
  tentative sensor/motor pins freed by the final map; 17 frees once the DIN move is
  flashed; 35 is input-only, spare for a second limit switch if ever needed).

**Daily discipline:**
- Commit your code + your filled-in section of this doc **at the end of each day**, even
  if the day isn't fully working. A partial commit with an honest "stuck on X" beats
  silence.
- Every day's deliverable includes: **working code**, **the "what I did" section below
  filled in**, and **a photo of the actual wiring** (phone photo is fine — clarity over
  polish).

---

## Master BOM (all 5 days — for procurement to see at a glance)

| # | Item | Suggested part | Qty | Needed by | Sourcing |
|---|---|---|---|---|---|
| 1 | MCU board | DFRobot FireBeetle 2 ESP32-UE (N16R2) | 1 | Day 1 | Already have |
| 2 | mmWave sensor | HLK-LD116S (24 GHz presence/PIR) | 1 | Day 2 | Import — confirm arrival |
| 3 | Doppler motion sensor | RCWL-0516 | 1 | Day 2 | Local — cheap, use as a comparison/fallback |
| 4 | Planetary gear DC motor | (project's chosen motor) | 1 | Day 3 | Local/Import |
| 5 | Motor driver | HW-166 (TB6612FNG, 2-channel) | 1 | Day 3 | Local/Import — only channel A used for now |
| 6 | Limit switch, SPDT | Micro limit switch | 1 | Day 3 (stretch) | Local — home only, no end-of-travel switch in v1 |
| 7 | I²S DAC + amp | MAX98357A | 1 | Day 4 | Already used in `esp_audio/` |
| 8 | Speaker | 4 Ω or 8 Ω, ~3 W | 1 | Day 4 | Local |
| 9 | Breadboard + jumper wires | — | 1 set | Day 1 | Local |
| 10 | Multimeter | — | 1 (shared) | All days | Local |
| 11 | USB cable (data-capable) | matches board's port | 1 | Day 1 | Local |
| 12 | 5 V bench supply or USB power bank | ≥2 A | 1 | Day 3+ | Local — **don't power the motor from the board's 3.3 V/USB rail** |

---

## Day 1 (Monday) — Get oriented, get building

### Why
You can't wire anything sensibly without knowing what the device is *for* and what's
already been decided. This also front-loads all the toolchain pain onto a day with no
hardware risk.

### How
1. Read, in this order: [`ARCHITECTURE.md`](ARCHITECTURE.md) (what Engage Bot is, end to
   end), [`ELECTRONICS_ARCHITECTURE.md`](ELECTRONICS_ARCHITECTURE.md) (the electronics
   team's plan — remember it's stale on board/sensor, current doc corrects it),
   [`esp_audio/README.md`](../esp_audio/README.md) (the actual working firmware +
   wiring for this exact board today).
2. Install Arduino IDE (2.x). Add the ESP32 board package: **File → Preferences →
   Additional boards manager URLs** →
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   → **Tools → Board → Boards Manager** → install "esp32 by Espressif Systems".
3. Select **Tools → Board → ESP32 Arduino → ESP32 Dev Module** (this board doesn't have
   a dedicated DFRobot entry in the standard package — Dev Module works at the GPIO
   level, which is all you need). Set **Flash Size: 16MB**, leave other settings default.
4. Plug in the board, pick the right **Port**, and flash the built-in `Blink` example
   (**File → Examples → 01.Basics → Blink**) to confirm the toolchain + board + USB
   driver all work.
5. Open **Tools → Serial Monitor** at 115200 baud, flash a sketch that just does
   `Serial.println("hello")` in `loop()`, and confirm you see it. This is your sanity
   check for every day after this one.

### BOM
FireBeetle 2 ESP32-UE board, USB cable. Nothing else.

### Pins
None yet.

### ✍️ What I did (fill in)
- **Date:**
- **Summary of what's understood about the project (2–3 sentences, your own words):**
- **Toolchain setup:** board package version installed, board/port settings used
- **Problems hit + how solved:**
- **Time spent:**
- **Open questions for mentor:**

---

## Day 2 (Tuesday) — Motion sensor: HLK-LD116S vs. RCWL-0516

### Why
The product's whole pitch is *"detects a shopper who stops"* — not just motion. A plain
Doppler motion sensor (RCWL-0516) can only see **movement**; it goes silent the instant
someone stands still, because Doppler sensing has nothing to measure once relative
velocity is zero. A presence-radar module (HLK-LD116S) is built to keep reporting
"someone is there" even when they're motionless. **This is a hypothesis to prove
empirically today, not just read about** — you should end the day having watched both
sensors fail/succeed at detecting a person standing still, in your own Serial Monitor
log.

If HLK-LD116S hasn't cleared customs yet, start with RCWL-0516 today (it's the simpler
circuit anyway — good for learning the pattern of "read a sensor pin, print to Serial")
and swap in HLK-LD116S the moment it arrives, even if that's mid-week.

### How
1. **RCWL-0516:** 3-pin module (VIN, GND, OUT). OUT goes HIGH briefly when it detects
   motion. Wire it, write a sketch that prints `HIGH`/`LOW` on OUT with `millis()`
   timestamps, and **stand still in front of it** — confirm it stops reporting you.
2. **HLK-LD116S:** find and read its actual datasheet first — confirm its interface
   (UART vs. a simple digital "occupied" pin; exact voltage — most of these modules are
   3.3 V logic but *verify*, since some HLK boards want 5 V power with a 3.3 V-safe
   signal pin and some don't). Wire it per what you find, write a sketch that prints
   presence state (and distance, if the protocol gives you one), and repeat the
   stand-still test.
3. Write up the comparison (see fill-in below) and **pick the sensor this project
   actually ships with** — the reasoning matters more than the pin count.

### BOM
RCWL-0516, HLK-LD116S, jumper wires, breadboard.

### Pins (finalized — confirm against the board, see §0)
| Signal | GPIO | Notes |
|---|---|---|
| Sensor input (ESP ← sensor) | GPIO34 | RCWL-0516 OUT (digital) wires straight here; if HLK-LD116S is UART, this is UART2 RX. Input-only pin, no internal pull — add an external pull resistor if the module's output needs one |

**Single-pin only, decided.** No TX pin is budgeted — if HLK-LD116S turns out to need
config commands sent back to it (bidirectional UART), that's a real conflict with the
finalized pin map (GPIO34 is input-only and can't do TX). Stop and flag this to your
mentor immediately rather than improvising a second pin; don't wire both sensors
simultaneously either way, since only one ships.

### Circuit diagram
Draw (hand sketch photo is fine) or take a clear photo of the actual breadboard wiring
for **whichever sensor you end up recommending**. Label every wire.

### ✍️ What I did (fill in)
- **Date:**
- **RCWL-0516 result:** did it lose the person when they stood still? (expected: yes)
- **HLK-LD116S result:** interface actually used (UART/digital), did it hold presence
  through stillness?
- **Final BOM used:**
- **Final pins used:**
- **Circuit diagram/photo:** (link or embed)
- **Code location:** `esp_arduino_prototypes/01_motion_sensor/`
- **Recommendation + why:**
- **Problems hit + how solved:**
- **Time spent:**
- **Open questions for mentor:**

---

## Day 3 (Wednesday) — Motor + motor driver (HW-166 / TB6612FNG)

### Why
The mechanism (whatever it drives — check with mechanical/your mentor on today's
target motion) needs controlled forward/reverse/speed, not just "on." This is also
where a wiring mistake can actually damage hardware (stall current, wrong voltage) —
go slower and double-check before applying power.

### What HW-166 actually is
It's a breakout board for the **TB6612FNG** dual H-bridge IC — a known, well-documented
part (unlike a mystery module), so today isn't a datasheet hunt, it's careful wiring.
Key facts:
- **2 independent channels** (A and B) — this project only needs one motor, so you'll
  wire **channel A** and leave B unpopulated (worth knowing it's there if a second
  motor ever gets added).
- **Logic side (VCC):** 3.3–5.5V — safe to power directly from the ESP32's 3.3V, no
  level shifting needed.
- **Motor side (VM):** separate rail, 2.7–15V, **matched to your actual motor's rated
  voltage** — check the motor's label/datasheet.
- **Per-channel current:** ~1.2A continuous / ~3.2A peak. Check this against the
  motor's **stall current** (usually on its datasheet, or measure it: block the shaft
  from turning with the multimeter in series — briefly, don't hold it long) — if stall
  current exceeds ~3.2A this driver isn't enough and you need to flag it before
  building further.
- **STBY pin:** outputs stay disabled until STBY is HIGH. This project ties STBY
  **permanently HIGH via a resistor** to the driver's logic-supply rail (no GPIO,
  no firmware step) — same pattern already used for the MAX98357A's own SD pin.
  There's no software enable/disable; the driver is live as soon as it has power.
  If nothing happens when you apply power, check STBY continuity with a multimeter
  before suspecting firmware.
- Exact silkscreen labels can vary slightly by seller — **confirm yours matches**
  (AIN1/AIN2/PWMA/STBY/VM/VCC/GND/AO1/AO2, plus the same set with B) before wiring.

### How
1. Confirm your board's silkscreen matches the pin functions above.
2. Power **VM from a separate 5V source** (bench supply or power bank), **not** from
   the ESP32's 3.3V or USB 5V pin — the ESP32 can't supply motor current and a stall
   could brown out or damage the board. **VCC** can come from the ESP32's 3.3V.
3. **Tie all grounds together** — ESP32 GND, driver GND, and the separate motor supply's
   GND all need to be common, or nothing will work correctly (this is the single most
   common "driver does nothing" bug).
4. Wire AIN1 and AIN2 (direction) and PWMA (speed) per the pin table below. Wire
   **STBY to a resistor pull to the driver's logic-supply rail** (not a GPIO — no
   pin budgeted for it), and check continuity with a multimeter before applying
   power. Wire motor leads to AO1/AO2.
5. Write a sketch: spin forward at half speed for 2s, stop for 1s, spin reverse at
   half speed for 2s, stop. No STBY step needed in `setup()` — it's already HIGH in
   hardware. Use `ledcWrite`/`analogWrite` on PWMA for speed; AIN1/AIN2 set
   direction (one HIGH one LOW; both LOW = coast/stop, both HIGH = brake).
6. **Stretch goal, not required today:** wire the home limit switch (`INPUT_PULLUP`,
   one leg to GPIO, other to GND) and stop the motor immediately when it trips.

### BOM
Planetary gear DC motor, HW-166 (TB6612FNG) driver, 5 V bench supply/power bank, limit
switch (stretch), jumper wires, multimeter.

### Pins
| Signal | GPIO | Notes |
|---|---|---|
| AIN1 (direction) | GPIO13 | |
| AIN2 (direction) | GPIO19 | |
| PWMA (speed) | GPIO23 | `ledcWrite` |
| STBY (enable) | *(no GPIO)* | tied permanently HIGH via a resistor to the logic-supply rail — see §"What HW-166 actually is" above |
| Limit switch (home) — stretch | GPIO33 | `INPUT_PULLUP`, switch to GND |

One limit switch only (home) — no end-of-travel switch in v1.

### Circuit diagram
Photo of the wiring: ESP32 → driver control pins (AIN1/AIN2/PWMA), STBY → resistor
pull to the logic-supply rail (not the ESP32), driver → motor (AO1/AO2), driver VM →
separate 5V supply, driver VCC → ESP32 3.3V, all grounds tied together.

### ✍️ What I did (fill in)
- **Date:**
- **Motor's rated voltage + measured/datasheet stall current, vs. TB6612FNG's ~3.2A
  peak rating — does it clear?**
- **Final BOM used:**
- **Final pins used:**
- **Circuit diagram/photo:** (link or embed)
- **Code location:** `esp_arduino_prototypes/02_motor_driver/`
- **Limit switch attempted? Result:**
- **Problems hit + how solved:**
- **Time spent:**
- **Open questions for mentor:**

---

## Day 4 (Thursday) — Speaker (MAX98357A)

### Why
This one's already solved once in this project — `esp_audio/` plays WAV clips through
a MAX98357A on **this exact board**, wiring already proven on real hardware. Today
isn't "figure out if it's possible," it's **understand a working reference and
reproduce the hardware result in Arduino IDE**, since your final Friday sketch needs
audio in the same toolchain as your sensor + motor code.

### How
1. Read [`esp_audio/README.md`](../esp_audio/README.md)'s wiring table — **use those
   exact pins**, don't reinvent them; they're already confirmed working. (DIN is
   moving to GPIO22 in the finalized map per `ELECTRONICS_ARCHITECTURE.md` §2.1, but
   that firmware change hasn't landed yet — replicate what's actually flashed today,
   GPIO17, not the pending target.)

   | MAX98357A pin | GPIO |
   |---|---|
   | BCLK | GPIO26 |
   | LRC (WS) | GPIO25 |
   | DIN | GPIO17 |
   | VIN, SD | 3.3V |
   | GND | GND |

2. Wire the amp + speaker per that table.
3. In Arduino IDE, install an I²S-capable audio library — `earlephilhower/ESP8266Audio`
   (has `AudioOutputI2S` + `AudioGeneratorWAV`) or `pschatzmann/arduino-audio-tools`
   are both used elsewhere in this project's planning docs.
4. Put a short mono 16-bit WAV clip in **LittleFS** or on an **SD card** (LittleFS is
   simpler — no extra hardware) and play it through the library on boot.
5. Confirm actual audible sound from the speaker — not just "no errors in Serial
   Monitor."

### BOM
MAX98357A, small speaker (4–8 Ω), jumper wires. (No new sensor/motor parts today.)

### Pins
Exactly the table in step 1 above — this is the one day where pins are **not**
suggestions, they're already proven.

### Circuit diagram
Photo of your wiring — compare side-by-side with `esp_audio/docs/wiring-max98357a.svg`
to confirm you matched it.

### ✍️ What I did (fill in)
- **Date:**
- **Library used:**
- **Where the WAV clip is stored (LittleFS/SD) and how it got there:**
- **Confirmed audible output? (yes/no, describe)**
- **Final BOM used:**
- **Circuit diagram/photo:** (link or embed)
- **Code location:** `esp_arduino_prototypes/03_speaker_playback/`
- **Problems hit + how solved:**
- **Time spent:**
- **Open questions for mentor:**

---

## Day 5 (Friday) — Merge into one integrated sketch

### Why
Three separate sketches prove three separate subsystems work. The actual product needs
all three running **on one board, together, without fighting each other** (e.g. audio
playback and motor PWM can both be timing-sensitive — this is exactly the kind of
interaction the real firmware handles with FreeRTOS tasks, per
`ELECTRONICS_ARCHITECTURE.md` §3). Today is where you find out what breaks when they
share a board.

### How
1. Create `esp_arduino_prototypes/04_integration/04_integration.ino`, combining all
   three subsystems' pin assignments from Days 2–4 (check for conflicts — you shouldn't
   have any if you followed the pin tables above, but confirm).
2. Build the simple loop: **sensor detects presence → motor performs one movement →
   speaker plays the clip → short cooldown → back to watching the sensor.**
3. Run it end to end, more than once. Watch for: does the motor's current draw glitch
   the audio? Does anything reset unexpectedly? Does the sensor throw false triggers
   from the motor's own vibration/motion?
4. Update the **Master BOM** table at the top of this doc with the *actual final* parts
   and pin numbers you used across all four days (this becomes the source of truth for
   procurement and for whoever ports this into the real `esp_audio/` firmware).
5. Write the "porting notes" section below — this is the handoff to whoever moves this
   logic into the production ESP-IDF codebase.

### BOM
Everything from Days 2–4, all on one board.

### Pins
The union of the Day 2 + Day 3 + Day 4 tables above (confirm no conflicts).

### Circuit diagram
One photo/diagram of the fully integrated wiring — this is the one that should end up
in `ELECTRONICS_ARCHITECTURE.md` once your mentor reviews it.

### ✍️ What I did (fill in)
- **Date:**
- **Final integrated behavior achieved (describe the working loop):**
- **Interaction bugs found between subsystems (audio+motor, sensor false triggers,
  etc.) and how handled:**
- **Final BOM used (also update the Master BOM table above):**
- **Final pins used (also update the Master BOM table above):**
- **Circuit diagram/photo:** (link or embed)
- **Code location:** `esp_arduino_prototypes/04_integration/`
- **Porting notes for the real ESP-IDF firmware** (what would need to change — library
  equivalents, task structure, anything Arduino-specific that won't translate):
- **Problems hit + how solved:**
- **Time spent:**
- **Open questions for mentor:**

---

## End-of-week check-in
By Friday close, your mentor should be able to read this single file top to bottom and
know: what sensor this project ships with and why, what the motor driver's real pinout
is, that audio works on this toolchain, and what a single integrated demo looks like —
without needing to ask you anything that isn't already answered above.
