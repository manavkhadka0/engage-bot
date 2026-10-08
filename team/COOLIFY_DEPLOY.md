# Coolify deploy notes — Tokinomo

## Services in one Coolify project

| Service | Image / build | Port | Notes |
|---|---|--:|---|
| `api` | `tokinomo-backend/Dockerfile` | 3000 | NestJS; migrates on boot |
| `web` | `tokinomo-frontend/Dockerfile` | 3001 | Next.js; set build args |
| `postgres` | `timescale/timescaledb:latest-pg16` | 5432 | Internal |
| `redis` | `redis:7-alpine` | 6379 | BullMQ |
| `minio` | `minio/minio` | 9000 | **Local dev only** — image no longer pullable; hosted audio storage → R2/B2 (see "Object storage") |
| `emqx` | `emqx/emqx:5.8.6` | 1883 / 18083 | MQTT — per-device auth + ACL via `api` (Contract ④) |

Local stacks (both verified end to end — see `team/TEST_CHECKLIST.md`):

- Infra only + `pnpm start:dev` / `pnpm dev`: `tokinomo-backend/docker-compose.yml`.
- Production-image rehearsal (real `api` + `web` Dockerfiles, empty-DB first boot):
  `HOST_IP=<LAN IP> docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --build`
  (create its DB once: `CREATE DATABASE tokinomo_full`). Uses its own EMQX volume.

## Object storage — read before deploying MinIO

**The `minio/minio` and `minio/mc` images are no longer pullable** from Docker
Hub or quay.io (checked 2026-10-08, even `latest`). `docker-compose.yml` only
works on a machine that still has them cached, so **do not deploy the `minio`
service on a fresh Coolify host.** The backend only speaks the S3 API
(`StorageService` reads `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_REGION`,
`S3_FORCE_PATH_STYLE`), so any S3-compatible store works with env changes only:

- Free managed tier — Cloudflare R2 or Backblaze B2 (recommended for anything
  internet-facing; setup below).
- Self-hosted alternative — Garage, SeaweedFS or RustFS (images are pullable).

### Free-tier setup: Cloudflare R2 (recommended)

Verified: the app's storage code and `pnpm storage:check` against MinIO.
**Not yet verified against R2 itself** — that needs your Cloudflare account;
step 4 is how you verify it. Check Cloudflare's pricing page for the current
free allowance (at time of writing: 10 GB storage and generous request
quotas, with no egress fees) and whether signup asks for a payment method.

1. Cloudflare dashboard → **R2 Object Storage** → **Create bucket** → name it
   `tokinomo`.
2. R2 → **Manage API tokens** → **Create API token** → permission
   **Object Read & Write**, scoped to the `tokinomo` bucket only. Copy the
   **Access Key ID** and **Secret Access Key** (shown once) and your
   **Account ID**.
3. Set these on the `api` service (Coolify env), replacing the MinIO values:
   ```
   S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   S3_PUBLIC_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_ACCESS_KEY_ID=<access key id>
   S3_SECRET_ACCESS_KEY=<secret access key>
   S3_BUCKET=tokinomo
   S3_FORCE_PATH_STYLE=true
   ```
   Do **not** deploy the `minio` / `minio-init` services. Create the bucket by
   hand (step 1); the backend's auto-create only logs a warning because a
   bucket-scoped token can't create buckets.
4. Verify before pointing devices at it — from your machine with the same
   variables in `tokinomo-backend/.env` (or exported):
   ```bash
   pnpm storage:check
   ```
   or, on the deployed API (the runtime image has no pnpm):
   ```bash
   node_modules/.bin/tsx scripts/storage-check.ts
   ```
   It uploads a tiny object, presigns a URL, downloads it and compares bytes.
   All four lines must say `PASS`.

R2 serves HTTPS only. That is fine for the ESP32 downloader (it uses the
Mozilla cert bundle). The audio is fetched by the device, not the browser, so
no bucket CORS rules are needed.

### Free-tier alternative: Backblaze B2

Same steps with: bucket created in B2, an **Application Key** scoped to that
bucket (read + write), `S3_ENDPOINT` = `S3 Endpoint` shown on the bucket page
(`https://s3.<region>.backblazeb2.com`), `S3_PUBLIC_ENDPOINT` = same,
`S3_REGION` = the region in that hostname (e.g. `us-west-004`),
`S3_ACCESS_KEY_ID` = keyID, `S3_SECRET_ACCESS_KEY` = applicationKey. Verify
with `pnpm storage:check`. Check B2's current free allowance and egress terms.

`S3_PUBLIC_ENDPOINT` is what presigned download URLs carry to the device, so it
must be reachable from the ESP32 (the firmware downloader supports HTTPS via
the Mozilla cert bundle). Locally that is this machine's *current* LAN IP —
a stale value means uploads work but devices cannot download.

## EMQX auth (Contract ④ — per-device serial+token)

EMQX's HTTP auth/authz calls the backend's `/mqtt/auth` and `/mqtt/acl`
endpoints (`src/modules/mqtt-auth`). Two config files:

- `emqx/emqx.conf` — backend runs on the host (`http://host.docker.internal:3000`).
- `emqx/emqx.container.conf` — backend is the `api` service in the same
  network (`http://api:3000`). **Use this one in Coolify**: mount it as
  `/opt/emqx/etc/emqx.conf`.

First boot imports the file's `authentication`/`authorization` into EMQX's
runtime store — a later plain restart won't re-read it, so recreate the
`emqx` volume if you change these URLs post-deploy. EMQX may log `econnrefused`
for its auth webhook until `api` is up; the backend's MQTT client reconnects
on its own within seconds.

## API env (Coolify)

```
NODE_ENV=production
PORT=3000
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com
DATABASE_URL=postgresql://…
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…
S3_BUCKET=tokinomo
S3_FORCE_PATH_STYLE=true
MQTT_URL=mqtt://emqx:1883
# Backend's own superuser credential for EMQX (see src/modules/mqtt-auth) —
# devices authenticate separately with serial+provisionToken, not this.
MQTT_USERNAME=tokinomo-backend
MQTT_PASSWORD=<long-random>
BETTER_AUTH_SECRET=<long-random>
BETTER_AUTH_URL=https://app.yourdomain.com
RESEND_API_KEY=…
RESEND_FROM_EMAIL=Tokinomo <noreply@yourdomain.com>
```

`BETTER_AUTH_URL` must be the **public frontend origin** when the web app
proxies `/api/auth/*` (same pattern as local `:3001`).

## Web env (Coolify)

Build args + runtime:

```
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Traefik / Coolify: point `app.` → web:3001, `api.` → api:3000.
Web rewrites `/api/auth/*` and `/api/be/*` to `NEXT_PUBLIC_API_URL`.

## After first deploy

The `api` container runs `prisma migrate deploy` on boot (`scripts/start.sh`),
so an empty database is migrated automatically. Then seed the platform owner:

```bash
# inside api container (or one-off job) — the runtime image has no pnpm
node_modules/.bin/tsx prisma/seed-platform.ts
```

Default seed: `admin@baliyo.ventures` / `***REMOVED***` — **set
`PLATFORM_EMAIL` / `PLATFORM_PASSWORD` for any public deploy.** Also change
every other dev default before going public: Postgres `tokinomo/tokinomo`,
MinIO `tokinomo/***REMOVED***`, EMQX dashboard `admin/public`.

Tenant creation emails the brand admin their credentials via Resend. If the
mail provider fails (e.g. sending domain not yet verified) the tenant is still
created and the API returns `emailSent: false` — hand the credentials over manually.

## Smoke test (no hardware)

1. Login platform → create tenant (GROWTH)
2. `/admin/devices` → provision serial → assign tenant → **Simulate loop**
3. Open `/app/{slug}` → overview/analytics show events
4. Upload WAV → Push → ack
5. Invite ≤ 2 extra members on `/users`
