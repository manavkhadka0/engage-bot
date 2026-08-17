# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — brand-side marketing / trade-marketing staff.** Staff at an FMCG brand that has bought a fleet of shelf robots. They are running an in-store audio campaign they cannot personally supervise, across stores they do not own. Their job: confirm the units are alive, swap what a robot says on the shelf, and leave with engagement numbers they can defend when the spend comes up for renewal. They work **on a phone, often standing in a store aisle**.

**Secondary — Baliyo Ventures platform operators.** They provision device serials, assign devices to a tenant, location, and product, watch fleet health across every brand, and set tenant tiers. They work **on a laptop at a desk**.

These two are not the same user at different screen sizes. Brand staff are non-technical and episodic; platform operators are technical and continuous.

**Roles implemented:** platform — `PLATFORM_OWNER`, `PLATFORM_OPERATOR`; brand — `BRAND_ADMIN`, `BRAND_STAFF`, `BRAND_VIEWER` (`tokinomo-frontend/lib/roles.ts`). Brand roles are defined and carried in the session, but the console does not yet gate UI by them beyond user invitation.

## Product Purpose

Tokinomo is a shelf-advertising robot plus the multi-tenant SaaS platform that runs it. The device grips a product on a retail shelf and makes it move, light up, and speak when a shopper lingers nearby.

The platform exists to answer a strategic choice the team made deliberately: ship connected devices rather than "black boxes" we never see again. Each unit reports presence detections, dwell time, audio plays, and online/offline status over MQTT; audio can be pushed to any unit over the air. Success means a brand can see its fleet working and renew on evidence, and Baliyo learns a unit is down before the client complains.

## Positioning

Presence sensing is **mmWave, not a camera** — it detects a *stationary* shopper and measures dwell time, which is what makes an interaction adaptive rather than a motion tripwire, and it carries no camera-privacy burden in a retail aisle.

The second differentiator is the software layer itself: a comparable vendor sells a shelf gadget as a one-time hardware transaction. Tokinomo is sold as a measured, remotely-updatable fleet, so the same platform onboards one brand today and others later.

## Operating Context

- **Retail shelves** in supermarkets and malls. Devices are battery-powered with mains charging so a unit survives a power cut and is not tied to a free shelf outlet.
- **Wi-Fi only, no SIM** — the deployment site provides Wi-Fi; per-unit cellular cost was rejected at fleet scale.
- **Two device postures, both first-class.** Brand users operate the console on phones; Baliyo operators on laptops. Neither console is a resized version of the other.
- **Three-layer system:** ESP32-S3 firmware → NestJS backend (device registry, telemetry, audio push, tenant isolation) → Next.js console. Firmware talks MQTT; the console talks HTTPS plus a Socket.IO channel for live status.
- **Two surfaces in one app:** a platform console at `/admin/*` and a tenant workspace at `/app/[tenantSlug]/*`, plus a public marketing site at `/`, `/features`, `/about`, `/faqs`, `/contact`.
- Platform operators can open a tenant workspace to assist or train, which the UI surfaces as an explicit impersonation state rather than silently.

## Capabilities and Constraints

**Confirmed and implemented or in progress:**
- Multi-tenant device registry with per-tenant isolation; a brand sees only its own devices and data.
- Live device status without refresh (Socket.IO `device.status` / `device.event`).
- Telemetry: presence detections, dwell events, audio plays, online/offline transitions, uptime.
- Audio library: upload, assign a clip to devices, and push, with **per-device acknowledgement lifecycle** (queued → sent → acked/failed). This is the commercially load-bearing feature.
- Analytics: KPIs, dwell distribution, plays over time, per-store breakdown.
- Product/SKU records, brand user invitation and roles (better-auth organization plugin), tenant creation/suspension and tier assignment, device provisioning and assignment, billing views.

**Constraints:**
- Tenant scoping is derived from the session, never from client-supplied input; cross-tenant leakage in the UI is a product failure, not a cosmetic bug.
- Device status must be encoded as dot **plus** label plus colour — never colour alone.
- Tenant resolution is path-based (`/app/[tenantSlug]`) today; subdomains were discussed but are not built.
- Tier structure: base tier is one audio clip per device; higher tiers add multiple clips and event theming. The architecture supports many clips already, so tiering is a provisioning/billing switch rather than a rebuild.

**Explicitly undecided — do not resolve these by inventing an answer:**
- White-label theming per brand (tenant logo/colours/subdomain) is a backlog candidate tied to the top tier, not a commitment.
- A global fleet map is planned but not built.
- Monthly report export (PDF) is planned but not built.
- Nepali/English localisation is a backlog item, not a commitment.
- Whether brand roles will gate console UI beyond user management.

## Brand Commitments

- Product name: **Tokinomo**. Built by **Baliyo Ventures**, under its Flexi product line. Baliyo is named as the maker on the public site.
- The marketing site's existing framing is **Sense → Speak → Prove**, with the positioning line "sense shoppers, play audio, prove engagement."
- No logo mark, brand typeface, or identity asset has been supplied. The wordmark is currently set text.

## Evidence on Hand

**There is no citable public proof yet. Future design and copy must not invent any.** Specifically:

- **No live deployment.** No real engagement numbers, uptime figures, dwell statistics, or sales-uplift data exist.
- **No nameable customer.** The first client (a 100-unit commitment from an energy-drink brand) appears in internal repository docs, but is **not cleared for public or marketing use**. Do not name it, imply it, or describe it identifiably on any public surface.
- **No testimonials, case studies, press, logos, or customer quotes.**
- **No third-party category statistics** are approved for use either. Internal docs describe shelf robots as "proven to lift sales" for FMCG brands, but that claim is unsourced and must not appear on a public surface.
- **No product photography or video** cleared for use. `tokinomo-frontend/public/` contains only stock Next.js SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).

**What does exist:** internal engineering documentation in `team/` (system, backend, frontend, and electronics architecture; a validated per-device BOM), backend seed data suitable for demonstrating the console, and a hardware prototype under active development. Design work needing visual proof should assume it must be produced or requested, never sourced.

## Product Principles

1. **Prove, don't promise.** The product's whole reason to exist is replacing assertion with device data. Fabricated proof on any surface contradicts the product itself.
2. **Two operators, two postures.** A phone in a supermarket aisle and a laptop at a desk are different design problems. Serving one by scaling the other fails both.
3. **Tenant isolation is a promise, not a setting.** A brand seeing another brand's data is a breach of the commercial proposition, not just a bug.
4. **The audio push must be legible end to end.** A pushed clip that might have arrived is worth less than one whose per-device state is visible.
5. **Multi-brand from day one.** Every decision assumes a second and third tenant, so nothing hard-codes the first client.

## Accessibility & Inclusion

- Status and state must never rely on colour alone; pair every status colour with a label or icon.
- Keyboard navigation, visible focus states, and colour-contrast compliance are required, with particular attention to status indicators.
- Dashboards must remain usable on tablet and phone; tables scroll inside their own container rather than breaking layout.
- Primary users are non-technical brand staff working in a visually busy, brightly lit retail environment on a handheld screen.
