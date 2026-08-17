# Tokinomo — End-to-End Test Checklist

**Stack:** Frontend `:3001` · Backend `:3000` · Docker (Postgres, Redis, MinIO, EMQX)  
**Platform seed:** `admin@baliyo.ventures` / `***REMOVED***`  
**Firmware:** not required — use **Simulate** on `/admin/devices`

---

## 0. Boot

```bash
cd tokinomo-backend && docker compose up -d
pnpm prisma migrate deploy && pnpm seed:platform
pnpm start:dev

cd ../tokinomo-frontend && pnpm dev
```

- [ ] Docker: postgres, redis, minio, emqx healthy
- [ ] http://localhost:3000/health → `status: ok`
- [ ] http://localhost:3001 loads
- [ ] http://localhost:3000/docs opens Scalar

---

## 1. Public site

- [ ] Landing hero feels premium (3D / motion, not terminal CLI)
- [ ] `/features` `/about` `/faqs` `/contact` render on mobile (375px)
- [ ] Nav works on mobile menu
- [ ] Primary CTA → `/login`

---

## 2. Platform auth

- [ ] Login as platform owner
- [ ] Redirect → `/admin`
- [ ] Sidebar: Overview, Tenants, Devices, Fleet, Billing
- [ ] Logout clears session; `/admin` redirects to login

---

## 3. Create tenant (hand-off)

- [ ] `/admin/tenants` → Create tenant
- [ ] Fields: name, slug, tier (BASIC / GROWTH / BRAND), admin credentials
- [ ] Tenant listed with trial subscription
- [ ] Save brand admin email + password for step 6

---

## 4. Device setup + fake test

- [ ] `/admin/devices` → Provision serial (`TK-0001`)
- [ ] Assign to tenant
- [ ] **Simulate → online** → status online
- [ ] **Simulate → loop** → detection / dwell / play
- [ ] `/admin/fleet` shows device; tenant filter works

---

## 5. Platform → brand workspace

- [ ] Open workspace `/app/{slug}` from tenants table
- [ ] Impersonation banner visible
- [ ] Overview KPIs + chart update after simulate
- [ ] Devices / analytics show live-ish data
- [ ] Return to `/admin` works

---

## 6. Brand admin

- [ ] Logout → login as brand admin → `/app/{slug}`
- [ ] **Overview** — KPIs + charts readable on mobile
- [ ] **Devices** — assigned list + status dots
- [ ] **Audio** — upload WAV (≤512KB) → Push → ack
- [ ] **Analytics** — dwell / plays charts
- [ ] **Billing** — tier, TRIAL, feature list
- [ ] **Users** — invite up to **admin + 2** (max 3 total)
- [ ] 4th invite blocked with clear error

---

## 7. Roles & billing

- [ ] Brand viewer/staff cannot invite if not admin
- [ ] `/admin/billing` — change tier (owner)
- [ ] Convert trial → paid → MRR estimate > 0
- [ ] Brand billing page reflects paid status

---

## 8. Mobile UX (required)

Test at **375px** and **414px**:

- [ ] Landing: no horizontal scroll
- [ ] Dashboard: sidebar collapses to drawer / bottom nav
- [ ] Tables scroll inside container
- [ ] Forms usable with thumb (large tap targets)
- [ ] Charts don’t overflow

---

## 9. Coolify readiness smoke

- [ ] Backend `Dockerfile` builds
- [ ] Frontend `Dockerfile` builds with `NEXT_PUBLIC_*` args
- [ ] `team/COOLIFY_DEPLOY.md` env vars filled for staging

---

## Pass / fail

| Area | Pass? | Notes |
|---|---|---|
| Public + login | | |
| Tenant create | | |
| Device simulate | | |
| Brand audio + stats | | |
| Member cap (3) | | |
| Mobile dashboard | | |

**Sign-off:** _____________ · Date: _____________
