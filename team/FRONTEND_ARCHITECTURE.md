# Frontend — Architecture & Work Plan

**Team:** Frontend · **Owner:** (frontend lead)
**Companion to** [ARCHITECTURE.md](ARCHITECTURE.md) · [TEAM_PLAYBOOKS.md](TEAM_PLAYBOOKS.md)

> **Your mission:** turn fleet data into something Baliyo and each brand can
> actually run. Two surfaces in one app — a **super-admin console** for Baliyo
> and a **brand workspace** for each tenant — with hard role/tenant separation.
> **You can start today** against the backend's OpenAPI mock; you don't need real
> devices to build.

---

## 1. What you must achieve

| # | Outcome | Proof |
|---|---|---|
| 1 | Login + role-based routing (platform vs brand) | Two roles land in two different apps |
| 2 | A brand sees **only its own** devices & data | No cross-tenant data visible |
| 3 | Live device status without refresh | WS updates flip an online/offline dot |
| 4 | Analytics that read at a glance | KPIs + dwell/plays charts on seed data |
| 5 | Audio upload + **push with per-device ack state** | Upload → assign → Push → ack shows |

---

## 2. Stack & packages

| Concern | Choice | Package(s) |
|---|---|---|
| Framework | Next.js (App Router) + TS | `next` `react` `react-dom` `typescript` |
| Styling | Tailwind + shadcn/ui | `tailwindcss` `class-variance-authority` `tailwind-merge` + shadcn (Radix) |
| Auth (client) | BetterAuth | `better-auth` (`/react` client) |
| Server state | TanStack Query | `@tanstack/react-query` |
| API types/client | generated from OpenAPI | `openapi-typescript` (+ `openapi-fetch`) or `orval` |
| Realtime | Socket.IO client | `socket.io-client` |
| Charts | Recharts | `recharts` |
| Forms + validation | RHF + zod | `react-hook-form` `zod` `@hookform/resolvers` |
| Icons | Lucide | `lucide-react` |
| Fleet map | MapLibre | `maplibre-gl` `react-map-gl` |
| Dates | date-fns | `date-fns` |
| Mock API (dev) | MSW | `msw` |
| Testing | Vitest + RTL + Playwright | `vitest` `@testing-library/react` `@playwright/test` |

---

## 3. App structure

```
frontend/app/
├─ (auth)/login/
├─ admin/                      # PLATFORM only (guarded)
│  ├─ tenants/                 # create/suspend brands, set tier
│  ├─ devices/                 # inventory + provisioning + assignment
│  └─ fleet/                   # global map & health (all tenants)
├─ app/[tenantSlug]/           # BRAND workspace (tenant-scoped)
│  ├─ page.tsx                 # overview KPIs
│  ├─ devices/                 # assigned devices + live status + map
│  ├─ products/                # SKUs
│  ├─ audio/                   # library + upload + push
│  ├─ analytics/               # dwell, plays, reach
│  └─ users/                   # brand users & roles
└─ layout.tsx
components/  ui/ · charts/ · device-status/ · forms/
lib/  api.ts (typed client) · auth.ts (session/role) · realtime.ts (socket)
hooks/  useDevices · useAnalytics · useLiveStatus · useAudio
```

---

## 4. Auth, roles & tenancy
- **BetterAuth client** for login/session; the session carries `role` + `activeOrganizationId`.
- **Route guards:** `PLATFORM_*` → `/admin`; brand roles → `/app/[tenantSlug]`. Use the Next.js proxy (`proxy.ts`, formerly middleware) + a server-side session check; never trust the client alone.
- **Tenant resolution:** path-based `/app/[tenantSlug]` now (subdomains later). A **platform user can switch tenant / impersonate** (org switcher → sends `x-tenant-id`).
- **Role-gated UI:** `BRAND_VIEWER` sees read-only; hide user-management from `BRAND_STAFF`.

---

## 5. The two surfaces

### 5.1 Super-admin console (Baliyo) `/admin`
- **Tenants:** create/suspend brands, set tier (Basic/Growth/Brand), see per-tenant device counts.
- **Device inventory & provisioning:** register a serial → generate token → **assign** to tenant + location + product.
- **Global fleet map/health:** every device across every tenant, colour-coded by status, filter by brand.
- **Firmware:** rollout status (later).

### 5.2 Brand workspace (tenant) `/app/[tenantSlug]`
- **Overview:** online/offline counts, today's detections & plays, uptime, dwell summary.
- **Devices:** assigned devices, **live status dot**, per-store grouping, per-device detail.
- **Products:** manage SKUs (name, image).
- **Audio library:** upload, preview, assign clip(s) to devices, **Push** with per-device **ack state** (queued → sent → acked/failed).
- **Analytics:** dwell distribution, plays over time, per-store breakdown, monthly report view.
- **Users:** invite/manage brand users & roles (BetterAuth org invitations).

---

## 6. Data & realtime layers
- **API client:** generate types from the backend **OpenAPI** (`openapi-typescript`), wrap with TanStack Query hooks. One typed client, no hand-written fetch.
- **Mock-first:** use **MSW** seeded from the OpenAPI examples so you build every screen **before** real devices/backend are live. Swap to the real API by flipping the base URL.
- **Realtime:** `socket.io-client` subscribes to `device.status` / `device.event`; update the Query cache so status dots and counters move live.

---

## 7. Key flows to nail
1. **Login → role routing** (platform vs brand landing).
2. **Provision & assign** (super-admin): serial → token → assign to tenant/location/product.
3. **Audio upload → assign → push**: show the command lifecycle per device (this is the money feature — make the ack states obvious).
4. **Analytics filtering:** date range + per-store filters, fast on aggregates.
5. **Empty/again states:** a brand with no devices yet, a device offline, an upload failing — write helpful copy, not dead ends.

---

## 8. Tasks

> **Scope decision:** for the **first Xtreme demo**, a working device plus a
> **basic fleet/status view** is enough — the full multi-tenant dashboard follows
> after. Build the Sprint-01 items to demo quality first; polish and depth come
> in the backlog.

### Sprint-01
- App shell + Tailwind/shadcn setup; **BetterAuth** login; role-based routing; org switcher for platform.
- **MSW mock** from OpenAPI so work isn't blocked on backend.
- Brand **overview** (KPIs) + **devices list with live status** (WS).
- **Audio library**: upload → assign → Push with ack state.
- Super-admin: **tenant list** + **device inventory/assignment**.

### Backlog
- Global fleet **map**; analytics deep-dives (dwell histogram, per-store); monthly report export (PDF).
- White-label theming (Brand tier: logo/colours/subdomain); i18n (Nepali/English); accessibility pass; Playwright e2e.

---

## 9. How you coordinate with other teams

| With | On | You give | You need |
|---|---|---|---|
| **Backend** | Contract ② API/WS | Your exact data needs per screen (so endpoints fit the UI) | **OpenAPI spec + seed data early**, WS event shapes, stable types |
| **Electronics** | — | (none direct) | (device data arrives via Backend) |
| **Mechanical** | — | (none) | (none) |
| **Lead (Manav)** | Brand look, roles UX | Working consoles for onboarding/training tenants | Branding assets, tier/feature gating rules, decisions on white-label |

**Golden rule:** you are **not blocked** by hardware. Build against the OpenAPI
mock + MSW from day one; real data swaps in when Backend and devices are ready.
Give Backend your screen-by-screen data needs so their endpoints match the UI.

---

## 10. Testing, a11y, responsive
- **Component tests** (Vitest + RTL) for the tricky bits: role gating, ack-state UI, filters.
- **e2e** (Playwright): login → see only own devices → push audio → see ack.
- **Accessibility:** keyboard nav, focus states, colour-contrast (esp. status colours — don't rely on colour alone; pair with label/icon).
- **Responsive:** dashboards are operated on laptops but must not break on tablet; tables scroll inside their own container.

## 11. Definition of done
A brand admin logs in, sees only their devices, watches live status, views
analytics, and pushes audio with visible ack; a platform admin creates a tenant
and assigns a device; everything works against the real API.

## 12. Risks
- **Blocked on backend** → mock-first (MSW + OpenAPI), non-negotiable.
- **Cross-tenant leakage in UI** → always scope by tenant from the session; test it.
- **Realtime complexity** → start with polling if WS slips, upgrade to sockets.
- **Status legibility** → encode state as dot + label + colour, never colour alone.
