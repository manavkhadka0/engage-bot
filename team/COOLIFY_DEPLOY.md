# Coolify deploy notes — Tokinomo

## Services in one Coolify project

| Service | Image / build | Port | Notes |
|---|---|--:|---|
| `api` | `tokinomo-backend/Dockerfile` | 3000 | NestJS; migrates on boot |
| `web` | `tokinomo-frontend/Dockerfile` | 3001 | Next.js; set build args |
| `postgres` | `timescale/timescaledb:latest-pg16` | 5432 | Internal |
| `redis` | `redis:7-alpine` | 6379 | BullMQ |
| `minio` | `minio/minio` | 9000 | Audio storage |
| `emqx` | `emqx/emqx:5.8.6` | 1883 / 18083 | MQTT (firmware later) |

Local stack: `tokinomo-backend/docker-compose.yml`.

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

```bash
# inside api container (or one-off job)
pnpm seed:platform
```

Default seed: `admin@baliyo.ventures` / `***REMOVED***` (override via env).

## Smoke test (no hardware)

1. Login platform → create tenant (GROWTH)
2. `/admin/devices` → provision serial → assign tenant → **Simulate loop**
3. Open `/app/{slug}` → overview/analytics show events
4. Upload WAV → Push → ack
5. Invite ≤ 2 extra members on `/users`
