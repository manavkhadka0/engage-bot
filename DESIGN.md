---
name: Tokinomo
description: Layered papercut marketing and light console for a connected shelf-robot fleet — flat unmixed colour plates, depth by overlap.
colors:
  paper: "oklch(96.5% 0.012 85)"
  paper-2: "oklch(93% 0.014 80)"
  paper-3: "oklch(88% 0.018 75)"
  ink: "oklch(22% 0.055 260)"
  ink-secondary: "oklch(32% 0.04 255)"
  ink-muted: "oklch(48% 0.03 60)"
  madder-cut: "oklch(48% 0.22 25)"
  madder-ink: "oklch(98% 0.01 85)"
  layer-green: "oklch(38% 0.12 155)"
  layer-gold: "oklch(74% 0.16 85)"
  layer-navy: "oklch(28% 0.08 260)"
  layer-sky: "oklch(62% 0.12 230)"
  status-online: "oklch(48% 0.14 155)"
  status-warn: "oklch(72% 0.14 75)"
  status-danger: "oklch(55% 0.2 25)"
  rule-hairline: "oklch(78% 0.02 70)"
typography:
  display:
    fontFamily: "Geist Sans, Futura, Avenir Next, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.75rem, 5vw + 1rem, 5.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Geist Sans, ui-sans-serif, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    letterSpacing: "0.12em"
rounded:
  card: "1.25rem"
  pill: "999px"
  input: "0.75rem"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "6": "1.5rem"
  "8": "2rem"
  "12": "3rem"
  "16": "4rem"
---

# Tokinomo Design System

**Creative North Star: "Layered Papercut"**

Tokinomo’s public face is built like a Łowicz paper cut: flat unmixed colour plates stacked so depth comes only from overlap and a soft paper-edge shadow — never from neon glow or dark glass. Sense → Speak → Prove becomes concentric layers in the landing roundel. The old Instrument Deck / midnight field is retired.

Brand buyers work in bright aisles and sell-in decks; the field is light paper so the product meets them in their room. Madder red is the cut that marks action (CTAs, live emphasis). Layer green, gold, navy, and sky are plates — not decoration scatter.

## Colour

| Role | Token | Use |
|---|---|---|
| Paper | `--color-paper` | Page field |
| Madder cut | `--color-accent` | Primary actions, brand emphasis |
| Layer plates | `--color-layer-*` | Illustration, section accents |
| Ink | `--color-ink` | Display and body |
| Status | online / warn / danger | Semantic only — never branding |

No second competing accent. No cyan glow. No dark-only rule.

## Elevation

Paper-edge shadows use offset + soft blur (`--shadow-layer`). Zero-offset coloured halos are banned. Panels sit on `--color-paper` / `paper-2` with hairline rules.

## Components

- **Actions:** pill silhouette, madder fill, light ink on the cut
- **Nav:** soft rectangle paper strip with layer shadow (not glass blur)
- **Status dots:** hard-cornered 8px squares — unchanged product grammar
- **Roundel:** concentric SVG plates encoding Sense / Speak / Prove on the landing hero
- **Paper layer:** `.paper-layer` / `.paper-layer-2` — paste plates with hairline + `--shadow-layer` for marketing and console panels

## Motion

One authored moment on the landing: layers settle in (opacity) on the roundel. No cyan sweep. Respect `prefers-reduced-motion`.

- Keep type geometric sans; never serif display on this world
- Encode the mechanism in layers, not in fake metrics
- Label sample / simulated data when demonstration telemetry appears

## Don’t

- Don’t revive midnight, Shelf Cyan glow, or `data-theme="midnight"`
- Don’t use cream + terracotta + italic serif as a shortcut for “warm”
- Don’t invent sales-lift or customer proof
- Don’t round the status dot
