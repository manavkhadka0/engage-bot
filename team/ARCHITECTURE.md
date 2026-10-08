# Engage Bot Platform — System Architecture

**Status:** Proposed · **Date:** 26 Jul 2026 · **Owner:** Manav (Baliyo Ventures)
**Scope:** Multi-tenant SaaS for a fleet of shelf-advertising robots.

> **Tenancy in one line:** Baliyo Ventures owns the platform (super admin);
> each brand (Xtreme today, cosmetics/others later) is a **tenant** that manages
> its own products, devices, audio, and analytics. Devices are provisioned by
> Baliyo and assigned to a tenant. Nothing is hardcoded to Xtreme.

---

## 1. Requirements & constraints

**Functional**
- Register/provision physical devices (ESP32-S3) and track online/offline health.
- Assign a device → tenant → store location → product.
- Ingest telemetry: detections, dwell time, audio plays, uptime.
- Push audio to one device or many, over the air.
- Multi-tenant dashboard: super-admin console + per-brand workspace.
- Role-based access; a brand only ever sees its own data.

**Non-functional**
- **Scale target (realistic):** 100 devices now → low-thousands across several brands. A device reports lightweight events, not video — modest data rates.
- **Small team**, tight sprint → favour a **modular monolith**, managed services, and boring, well-known tech over microservices.
- **Low recurring cost** (Wi-Fi only, no SIM) → self-hostable stack on a single VPS to start, clean path to scale out.
- Offline-tolerant firmware (shop Wi-Fi is flaky) → local buffering + reconnect.

---

## 2. System context

```mermaid
graph TB
    subgraph Field["🏬 Retail floor"]
        DEV["Engage Bot device<br/>ESP32-S3 · mmWave · gear motor · LEDs · audio"]
    end

    subgraph Cloud["☁️ Engage Bot Platform"]
        BROKER["MQTT Broker<br/>(EMQX)"]
        API["Backend API + Workers<br/>(NestJS modular monolith)"]
        DB[("PostgreSQL<br/>+ TimescaleDB")]
        OBJ[("Object storage<br/>audio + firmware")]
        CACHE[("Redis<br/>presence · queues · cache")]
        WEB["Web Dashboard<br/>(Next.js)"]
    end

    SUPER["👤 Baliyo super admin"]
    BRAND["👤 Brand admin (Xtreme…)"]

    DEV <-->|"MQTT/TLS"| BROKER
    DEV -->|"HTTPS download<br/>audio/firmware"| OBJ
    BROKER <-->|"ingest / commands"| API
    API --- DB
    API --- OBJ
    API --- CACHE
    WEB -->|"REST + WebSocket"| API
    SUPER --> WEB
    BRAND --> WEB
```

**Flow in words:** devices talk to an MQTT broker over TLS; the backend consumes
telemetry and issues commands through that broker; audio/firmware binaries are
pulled over HTTPS from object storage (keeps large payloads off MQTT); the
dashboard talks REST + WebSocket to the backend.

---

## 3. Multi-tenancy & access model

### 3.1 Tenant hierarchy

```mermaid
graph TD
    P["🏢 Platform — Baliyo Ventures"]
    P --> T1["🥤 Tenant: Xtreme"]
    P --> T2["💄 Tenant: Cosmetics brand (future)"]
    P --> T3["… more tenants"]

    T1 --> U1["Users: brand admin, staff"]
    T1 --> PR1["Products (SKUs)"]
    T1 --> L1["Store locations"]
    T1 --> D1["Assigned devices"]
    T1 --> A1["Audio library"]
```

### 3.2 Roles (RBAC)

| Role | Belongs to | Can do |
|---|---|---|
| `PLATFORM_OWNER` | Baliyo | Everything, all tenants; create tenants; provision & assign devices; manage firmware |
| `PLATFORM_OPERATOR` | Baliyo | Support: view all tenants, re-assign devices, help onboard — no billing/destructive ops |
| `BRAND_ADMIN` | Tenant | Manage own users, products, locations, audio; view own devices & analytics; push audio |
| `BRAND_STAFF` | Tenant | Upload audio, view analytics — no user management |
| `BRAND_VIEWER` | Tenant | Read-only analytics |

**Device inventory** is owned by the platform. A device is `UNASSIGNED` until a
platform admin assigns it to a tenant — that's the moment it appears in the
brand's workspace.

### 3.3 Isolation strategy — **shared DB, shared schema, `tenant_id` + Postgres RLS**

**Tenant = BetterAuth organization.** The `tenant_id` on every domain row is the
BetterAuth `organizationId`; roles and memberships come from BetterAuth's
organization plugin, and Postgres RLS enforces isolation at the database as a
second line of defense.

```mermaid
graph LR
    subgraph Decision["Why shared-schema + Row-Level Security"]
        A["Every tenant row carries tenant_id<br/>(= BetterAuth organizationId)"] --> B["Postgres RLS policy<br/>filters by current_tenant"]
        B --> C["App sets tenant context per request<br/>(BetterAuth session → SET app.tenant_id)"]
        C --> D["Platform roles bypass RLS<br/>for cross-tenant views"]
    end
```

| Option | Verdict |
|---|---|
| **Shared schema + `tenant_id` + RLS** ✅ | Cheapest, simplest to operate, easy cross-tenant admin views. RLS gives defense-in-depth so a query bug can't leak across brands. **Chosen.** |
| Schema-per-tenant | More isolation, painful migrations across dozens of schemas. Overkill at this scale. |
| DB-per-tenant | Strongest isolation, highest ops cost. Revisit only for an enterprise brand with a contractual data-residency demand. |

---

## 4. Data model

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ PRODUCT : owns
    TENANT ||--o{ LOCATION : owns
    TENANT ||--o{ AUDIO_CLIP : owns
    TENANT ||--o{ DEVICE : "assigned"
    LOCATION ||--o{ DEVICE : "placed at"
    PRODUCT  ||--o{ DEVICE : "featured on"
    DEVICE   ||--o{ DEVICE_EVENT : emits
    DEVICE   ||--o{ DEVICE_AUDIO : plays
    AUDIO_CLIP ||--o{ DEVICE_AUDIO : "assigned to"
    DEVICE   ||--o{ COMMAND : receives

    TENANT {
        uuid id PK
        string name
        string slug
        enum tier "base|plus"
        enum status
    }
    USER {
        uuid id PK
        uuid tenant_id FK "null = platform user"
        string email
        enum role
    }
    PRODUCT {
        uuid id PK
        uuid tenant_id FK
        string name
        string sku
        string image_key
    }
    LOCATION {
        uuid id PK
        uuid tenant_id FK
        string name
        string address
        float lat
        float lng
    }
    DEVICE {
        uuid id PK
        string serial UK
        uuid tenant_id FK "null = unassigned"
        uuid location_id FK
        uuid product_id FK
        string fw_version
        enum status "online|offline|provisioning"
        timestamp last_seen
    }
    AUDIO_CLIP {
        uuid id PK
        uuid tenant_id FK
        string name
        string storage_key
        int duration_ms
        string checksum
        int version
    }
    DEVICE_AUDIO {
        uuid device_id FK
        uuid audio_clip_id FK
        bool active
    }
    DEVICE_EVENT {
        uuid id PK
        uuid device_id FK
        uuid tenant_id FK
        timestamp ts
        enum type "detection|dwell|play|online|offline"
        int dwell_ms
        jsonb meta
    }
    COMMAND {
        uuid id PK
        uuid device_id FK
        enum type "audio_update|play|reboot|config"
        jsonb payload
        enum status "queued|sent|acked|failed"
    }
```

`DEVICE_EVENT` is a **TimescaleDB hypertable** (time-partitioned) with
continuous aggregates rolling up per-device/per-day counts for fast dashboards.

---

## 5. Backend

### 5.1 Stack

| Concern | Choice | Why |
|---|---|---|
| API framework | **NestJS (TypeScript)** | Team familiarity, modular structure, first-class DI, guards for RBAC/tenancy |
| ORM | **Prisma** | Type-safe schema + easy migrations (RLS added via SQL migration) |
| Database | **PostgreSQL + TimescaleDB** | One engine for relational + time-series telemetry; RLS for isolation |
| MQTT broker | **EMQX** | Per-device auth + topic ACL, retained messages, LWT, scales far beyond Mosquitto |
| Object storage | **S3-compatible** (MinIO self-host → Cloudflare R2/S3) | Audio & firmware binaries; signed URLs; keeps big files off MQTT |
| Cache / queue / presence | **Redis + BullMQ** | Device presence, background jobs (audio push, rollups), pub/sub → WebSocket |
| Realtime to UI | **WebSocket (Socket.IO) / SSE** | Live device status without polling |
| Auth & tenancy | **BetterAuth (organization plugin)** | Reuses the team's existing NestJS BetterAuth multi-tenant pattern; **organization = tenant**, with members, roles & invitations built in |
| Deploy | **Coolify + Docker** on a VPS | Self-hosted PaaS: git-push deploys, automatic TLS (Traefik), one-click Postgres/Redis; every service is a Docker resource |

### 5.2 Service / module breakdown (modular monolith)

```mermaid
graph TB
    subgraph API["NestJS application"]
        AUTH["Auth<br/>JWT, refresh, guards"]
        TEN["Tenants<br/>brand CRUD, tiers"]
        USR["Users<br/>invite, roles"]
        DEVI["Devices<br/>registry, provisioning, assignment"]
        PROD["Products / Locations"]
        AUD["Audio<br/>upload, versioning, push"]
        CMD["Commands / OTA<br/>device control channel"]
        ANL["Analytics<br/>queries, rollups"]
        RT["Realtime<br/>WS gateway"]
    end

    subgraph Workers["Background workers (same codebase)"]
        ING["Ingestion worker<br/>MQTT → DB"]
        JOBS["Job worker<br/>audio push, daily rollups"]
    end

    BROKER["EMQX"] --> ING
    CMD --> BROKER
    ING --> DBx[("Postgres/Timescale")]
    JOBS --> DBx
    AUD --> OBJx[("Object storage")]
    RT --- REDISx[("Redis pub/sub")]
    ING --> REDISx
```

**Module responsibilities**
- **Auth** — **BetterAuth** (email/password + organization plugin) handles login, sessions, org membership, invitations, and roles; a thin `RolesGuard` + `TenantContextInterceptor` reads the BetterAuth session and sets `app.tenant_id` for RLS.
- **Tenants** — platform-only: create/suspend brands (= BetterAuth organizations), set tier (base/plus).
- **Users** — invite users into a tenant/org, assign roles (via BetterAuth org invitations).
- **Devices** — device inventory, provisioning tokens, assignment to tenant/location/product, lifecycle (`unassigned→provisioning→online/offline`).
- **Products / Locations** — tenant catalogue + store map.
- **Audio** — accept **pre-recorded clip uploads** (v1; no TTS), store in object storage, version + checksum, assign to devices, trigger push.
- **Commands / OTA** — enqueue commands, publish to device topic, track ack; firmware rollout.
- **Analytics** — read models over the telemetry hypertable + continuous aggregates.
- **Realtime** — WebSocket gateway; pushes live device status/events to the dashboard.
- **Ingestion worker** — subscribes to broker, validates, writes `DEVICE_EVENT`, updates presence in Redis + `last_seen`.
- **Job worker** — BullMQ jobs: fan-out audio push, nightly rollups, offline sweeps.

### 5.3 Repository structure

```
backend/
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ common/
│  │  ├─ guards/            # jwt.guard.ts, roles.guard.ts
│  │  ├─ interceptors/      # tenant-context.interceptor.ts
│  │  ├─ decorators/        # @Roles(), @CurrentTenant(), @CurrentUser()
│  │  └─ prisma/            # prisma.service.ts (sets RLS session var)
│  ├─ modules/
│  │  ├─ auth/
│  │  ├─ tenants/
│  │  ├─ users/
│  │  ├─ devices/
│  │  ├─ products/
│  │  ├─ locations/
│  │  ├─ audio/
│  │  ├─ commands/
│  │  ├─ analytics/
│  │  └─ realtime/
│  ├─ workers/
│  │  ├─ ingestion/         # mqtt consumer
│  │  └─ jobs/              # bullmq processors
│  └─ config/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/           # includes RLS policy SQL
├─ test/
├─ docker-compose.yml       # postgres, emqx, redis, minio
└─ Dockerfile
```

### 5.4 Tenant isolation guard (representative code)

```typescript
// common/interceptors/tenant-context.interceptor.ts
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    const session = req.session; // from BetterAuth (user + activeOrganizationId + role)

    // Platform roles see everything; brand roles are pinned to their org (tenant).
    const isPlatform = session.user.role?.startsWith('PLATFORM_');
    const tenantId = isPlatform
      ? (req.headers['x-tenant-id'] ?? null)          // platform impersonation
      : session.activeOrganizationId;                 // BetterAuth org = tenant

    // Bind the RLS session variable for this request's DB work.
    await this.prisma.$executeRawUnsafe(
      `SET app.tenant_id = '${tenantId ?? ''}';
       SET app.is_platform = '${isPlatform}';`,
    );
    return next.handle();
  }
}
```

```sql
-- prisma/migrations/xxxx_rls/migration.sql
ALTER TABLE device_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON device_event
  USING (
    current_setting('app.is_platform', true) = 'true'
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );
-- repeat for product, location, device, audio_clip, users …
```

---

## 6. Device ↔ Cloud protocol (MQTT)

### 6.1 Topic design (tenant + device namespaced)

| Topic | Dir | Retained | Purpose |
|---|---|---|---|
| `t/{tenant}/d/{device}/status` | D→C | ✅ (LWT) | `online` / `offline` presence |
| `t/{tenant}/d/{device}/telemetry` | D→C | — | heartbeat, fw version, wifi rssi |
| `t/{tenant}/d/{device}/event` | D→C | — | detection / dwell / play events |
| `t/{tenant}/d/{device}/cmd` | C→D | — | play, config, `audio_update`, reboot |
| `t/{tenant}/d/{device}/ack` | D→C | — | command results |

**Auth & ACL:** each device gets **per-device credentials** (username = serial,
password = provisioning token) enforced by EMQX; an ACL restricts a device to
**only its own** `t/{tenant}/d/{device}/#` subtree — one device can never read or
write another brand's topics. Large payloads (audio) are **not** sent over
MQTT — the `audio_update` command carries a signed HTTPS URL + checksum.

### 6.2 Telemetry + command sequence

```mermaid
sequenceDiagram
    participant D as Device (ESP32-S3)
    participant B as EMQX Broker
    participant I as Ingestion Worker
    participant DB as Postgres/Timescale
    participant W as Dashboard (WS)

    D->>B: CONNECT (LWT: status=offline)
    D->>B: PUB status=online (retained)
    B->>I: status + telemetry
    I->>DB: upsert device.last_seen, insert events
    I-->>W: presence/event push (via Redis)

    Note over D: shopper detected → dwell → perform
    D->>B: PUB event {type:dwell, dwell_ms:8200}
    B->>I: event
    I->>DB: insert DEVICE_EVENT

    Note over W: Brand admin clicks "Push new audio"
    W->>B: (via API/CMD) PUB cmd {audio_update, url, checksum}
    B->>D: cmd
    D->>D: download HTTPS → verify checksum → swap clip
    D->>B: PUB ack {audio_update: ok, version:3}
    B->>I: ack → mark COMMAND acked
```

---

## 7. Device provisioning & OTA

```mermaid
sequenceDiagram
    participant F as Factory/Bench (Baliyo)
    participant D as Device
    participant API as Backend
    participant SA as Super admin
    participant BA as Brand admin

    F->>D: Flash firmware + unique serial + provisioning token
    F->>API: Register device (status=UNASSIGNED)
    Note over D: On-site: Wi-Fi provisioning via SoftAP/BLE portal
    D->>API: (via broker) authenticate + status=online
    SA->>API: Assign device → tenant + location + product
    API->>D: cmd config {tenant, product, behavior}
    SA->>API: Push audio (or brand does it)
    API->>D: cmd audio_update {url, checksum}
    D->>API: ack → visible in Brand workspace
    BA->>API: Sees device online, manages audio & analytics
```

- **Wi-Fi onboarding:** SoftAP captive portal (or BLE) — installer picks the shop
  SSID and enters the password once; creds saved to NVS.
- **Firmware OTA:** `esp_https_ota` with **A/B partitions** (rollback on bad boot).
- **Audio OTA:** download to LittleFS, verify checksum, atomically switch active clip.

---

## 8. ESP32-S3 firmware architecture

**Framework:** Arduino-ESP32 via **PlatformIO** for sprint speed (path to ESP-IDF
later for production hardening). **FreeRTOS tasks** keep sensing, networking, and
performance independent so a Wi-Fi stall never freezes the interaction.

```mermaid
graph TB
    subgraph Tasks["FreeRTOS tasks"]
        NET["NetworkTask<br/>Wi-Fi + MQTT keepalive/reconnect"]
        SENSE["SensorTask<br/>LD2410 UART → presence + dwell"]
        LOGIC["InteractionTask<br/>state machine"]
        AUDIOt["AudioTask<br/>I²S playback from LittleFS"]
        TEL["TelemetryTask<br/>batch + publish events"]
        OTAt["OTATask<br/>audio/fw updates"]
    end
    SENSE -->|presence/dwell queue| LOGIC
    LOGIC -->|play cmd| AUDIOt
    LOGIC -->|motor + LED| ACT["Actuators"]
    LOGIC -->|events| TEL
    NET <-->|MQTT| TEL
    NET --> OTAt
    CFG[("NVS: creds/config")] --- NET
    FS[("LittleFS: audio")] --- AUDIOt
```

### 8.1 Interaction state machine

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> DETECTED: presence in range
    DETECTED --> DWELL: still present
    DWELL --> PERFORM: dwell ≥ threshold
    DETECTED --> IDLE: left quickly
    PERFORM --> COOLDOWN: sequence done
    COOLDOWN --> IDLE: timer elapsed
    PERFORM: motor moves to limit switch · LEDs pulse · audio plays · log event
```

**v1 behaviour:** one audio line on trigger, then a **cooldown** before it can
fire again. Dwell time is still measured and logged for analytics, but it does
**not** branch behaviour yet — adaptive multi-line-on-dwell is a later firmware
revision (the state machine already leaves room for it).

### 8.2 Firmware structure (PlatformIO)

```
firmware/
├─ platformio.ini
├─ src/
│  ├─ main.cpp                # task setup, wiring
│  ├─ config.h                # pins, thresholds, topics
│  ├─ net/
│  │  ├─ wifi_provision.cpp   # SoftAP captive portal
│  │  ├─ mqtt_client.cpp      # connect, LWT, pub/sub
│  │  └─ ota.cpp              # esp_https_ota + audio download
│  ├─ sensors/
│  │  └─ ld2410.cpp           # mmWave parse, presence + dwell
│  ├─ actuators/
│  │  ├─ motor.cpp            # gear motor + driver + limit switches
│  │  └─ leds.cpp             # WS2812 (FastLED)
│  ├─ audio/
│  │  └─ player.cpp           # I²S → MAX98357A from LittleFS
│  ├─ logic/
│  │  └─ interaction.cpp      # state machine
│  └─ telemetry/
│     └─ reporter.cpp         # event batching + JSON
└─ data/                      # default audio for LittleFS image
```

### 8.3 State-machine core (representative)

```cpp
// logic/interaction.cpp  (runs in InteractionTask)
void interactionLoop() {
  switch (state) {
    case IDLE:
      if (presence.inRange()) { state = DETECTED; tEnter = millis(); }
      break;
    case DETECTED:
      if (!presence.inRange()) state = IDLE;
      else if (millis() - tEnter > DWELL_MS) state = PERFORM;
      break;
    case PERFORM:
      motor.moveToLimit();            // drive out to the limit switch, then home
      leds.pulse(brandColor);         // WS2812 attention effect
      audio.play(activeClip);         // I²S clip from flash
      reporter.event("dwell", millis() - tEnter);
      reporter.event("play", audio.clipId());
      state = COOLDOWN; tEnter = millis();
      break;
    case COOLDOWN:
      if (millis() - tEnter > COOLDOWN_MS) state = IDLE;
      break;
  }
}
```

---

## 9. Frontend — multi-tenant dashboard

**Stack:** **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**,
**TanStack Query** for server state, **Socket.IO client** for live status,
**Recharts** for analytics.

### 9.1 Two surfaces, one app

```mermaid
graph TB
    LOGIN["/login"] --> ROUTE{Role?}
    ROUTE -->|Platform| ADMIN
    ROUTE -->|Brand| WORK

    subgraph ADMIN["/admin — Baliyo super-admin console"]
        A1["Tenants (create/suspend, tier)"]
        A2["Device inventory & provisioning"]
        A3["Assign device → tenant/location/product"]
        A4["Global fleet map & health"]
        A5["Firmware rollouts"]
    end

    subgraph WORK["/app/[tenantSlug] — Brand workspace"]
        W1["Dashboard: fleet status + KPIs"]
        W2["Devices (assigned) + map"]
        W3["Products (SKUs)"]
        W4["Audio library + push"]
        W5["Analytics: dwell, plays, reach"]
        W6["Users & roles"]
    end
```

**Tenant resolution:** path-based `/app/[tenantSlug]/…` to start (simple, no DNS
work); subdomains (`xtreme.app.baliyo.io`) later. A platform admin can **switch
tenant / impersonate** to support onboarding (sends `x-tenant-id`, server checks
platform role).

### 9.2 Structure

```
frontend/
├─ app/
│  ├─ (auth)/login/
│  ├─ admin/                  # platform-only (guarded by role)
│  │  ├─ tenants/
│  │  ├─ devices/            # inventory + provisioning
│  │  └─ fleet/
│  ├─ app/[tenantSlug]/       # brand workspace
│  │  ├─ page.tsx            # overview KPIs
│  │  ├─ devices/
│  │  ├─ products/
│  │  ├─ audio/
│  │  ├─ analytics/
│  │  └─ users/
│  └─ layout.tsx
├─ components/                # ui/, charts/, device-status/
├─ lib/
│  ├─ api.ts                 # typed client
│  ├─ auth.ts                # session, role helpers
│  └─ realtime.ts            # socket subscription
└─ hooks/                     # useDevices, useAnalytics, useLiveStatus
```

### 9.3 Key screens
- **Super-admin fleet map** — every device across every tenant, colour-coded by status; filter by brand.
- **Provisioning** — register a serial, generate token, assign to a tenant/location/product.
- **Brand dashboard** — online/offline count, today's detections & plays, dwell distribution, per-store breakdown.
- **Audio library** — upload, preview, assign to devices, **Push** (with per-device ack state from the command channel).

---

## 10. Deployment — Coolify + Docker

Everything runs on **Coolify** (self-hosted PaaS) on a VPS. Coolify's built-in
Traefik handles TLS and routing; Postgres, Redis, and MinIO are one-click
resources; the API, workers, web app, and EMQX deploy as Docker services from
git. This keeps cost low and gives git-push deploys without managing k8s.

```mermaid
graph TB
    subgraph Coolify["Coolify on a VPS (Docker)"]
        TRAEFIK["Traefik (TLS + routing)"]
        WEBc["Next.js app"]
        APIc["NestJS API"]
        WORKc["Workers (ingestion + jobs)"]
        EMQXc["EMQX"]
        PGc[("Postgres+Timescale")]
        REDISc[("Redis")]
        MINIOc[("MinIO")]
    end
    USERS["Dashboard users"] --> TRAEFIK --> WEBc --> APIc
    DEVc["Devices"] -->|MQTT/TLS| EMQXc
    EMQXc --- WORKc
    APIc --- PGc
    APIc --- REDISc
    APIc --- MINIOc
    WORKc --- PGc
    WORKc --- REDISc

    subgraph Scale["When device/tenant count grows"]
        direction LR
        note["Move Postgres → managed · object storage → R2/S3 ·<br/>EMQX → cluster · split workers onto their own Coolify node"]
    end
```

**Now:** one Coolify VPS runs the whole platform — enough for 100–500 devices at
very low cost. **Later:** move Postgres to managed, storage to R2/S3, and cluster
EMQX once device or tenant count justifies it — each is an isolated swap because
services are already containerised.

> **Coolify deploy notes:** one project, resources = `web` (Next.js), `api`
> (NestJS), `worker` (same image, worker entrypoint), `emqx`, `postgres`,
> `redis`, `minio`. Use a `docker-compose.yml` for the custom services and
> Coolify's managed databases for Postgres/Redis. Set secrets via Coolify env
> vars; point BetterAuth's base URL at the `api` domain.

---

## 11. Key architecture decisions (mini-ADRs)

| # | Decision | Chosen | Rejected | Rationale |
|---|---|---|---|---|
| 1 | App topology | Modular monolith | Microservices | Small team, one deployable; module boundaries keep future split cheap |
| 2 | Tenancy isolation | Shared schema + `tenant_id` + RLS | Schema/DB per tenant | Cheapest, safe via RLS, easy cross-tenant admin |
| 3 | Broker | EMQX | Mosquitto / cloud IoT | Per-device auth + ACL + scale without vendor lock-in |
| 4 | Telemetry store | Postgres + TimescaleDB | Separate TSDB | One engine to run; hypertables + continuous aggregates are enough |
| 5 | Big payloads | HTTPS from object storage | Over MQTT | MQTT stays light; audio/firmware via signed URLs + checksum |
| 6 | Firmware framework | Arduino-ESP32 (PlatformIO) | ESP-IDF now | Sprint speed; ESP-IDF is the later hardening path |
| 7 | Tenant routing | Path-based `/app/[slug]` | Subdomains now | No DNS/cert work to start; subdomains later |
| 8 | Auth & orgs | **BetterAuth** (organization plugin) | Custom JWT | Team already runs BetterAuth multi-tenant; orgs map cleanly to tenants |
| 9 | Hosting | **Coolify + Docker** | Raw Compose / k8s | Git deploys, auto-TLS, one-click DBs; Docker throughout, easy to scale out |
| 10 | v1 interaction | One line + cooldown | Adaptive-on-dwell now | Simplest reliable v1; dwell still logged, adaptive audio deferred |

---

## 12. Build order (maps to Sprint 01 + beyond)

> **MQTT is the one unfamiliar piece for the team** — budget a **1–2 day spike
> before wiring real ingestion:** run EMQX in Docker (Coolify), poke it with
> [MQTTX](https://mqttx.app) as a fake device, then wire a NestJS consumer
> (`@nestjs/microservices` MQTT transport, or `mqtt.js` in the ingestion worker).
> Everything else (NestJS, Next.js, Postgres, BetterAuth) is already in the
> team's wheelhouse.

1. **Contracts first** — lock the MQTT topics + JSON event/command schemas (§6). Firmware and backend build against these in parallel.
2. **Backend skeleton** — NestJS + Prisma schema + auth + tenants/devices modules + RLS migration.
3. **Ingestion path** — EMQX + ingestion worker writing `DEVICE_EVENT`; device shows online.
4. **Firmware loop** — state machine → motor/LED/audio → publish events (§8).
5. **Audio push** — upload → object storage → `audio_update` command → device ack.
6. **Dashboard** — brand workspace (device status + analytics) then super-admin console.
7. **Provisioning UX** — register/assign flow; Wi-Fi onboarding portal.

---

*Companion to [ENGAGE_BOT_MASTER.md](ENGAGE_BOT_MASTER.md) (product/business) and
[ELECTRONICS_BOM.md](ELECTRONICS_BOM.md) (hardware). This file is the technical
architecture of record.*
