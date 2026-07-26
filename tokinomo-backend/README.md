# Tokinomo Backend

NestJS multi-tenant API for Tokinomo (Baliyo Ventures × Xtreme).

Architecture refs: [`../team/BACKEND_ARCHITECTURE.md`](../team/BACKEND_ARCHITECTURE.md),
[`../team/ARCHITECTURE.md`](../team/ARCHITECTURE.md),
[`../team/CONTRACTS.md`](../team/CONTRACTS.md).

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm docker:up
pnpm exec prisma db push
pnpm seed:platform
pnpm start:dev
```

| URL | What |
|---|---|
| http://localhost:3000/health | Liveness |
| http://localhost:3000/docs | Scalar API reference |
| http://localhost:3000/api-json | OpenAPI JSON |
| http://localhost:3000/api/auth/* | Better Auth |
| http://localhost:9001 | MinIO (`tokinomo` / `***REMOVED***`) |
| http://localhost:18083 | EMQX (`admin` / `public`) |

## Auth (Better Auth)

- Email/password + **email verification** (Resend; console log if no `RESEND_API_KEY`)
- **Organization plugin** — org = tenant
- Platform roles (`user.role`): `PLATFORM_OWNER`, `PLATFORM_OPERATOR`
- Brand roles (`member.role`): `BRAND_ADMIN`, `BRAND_STAFF`, `BRAND_VIEWER`
- Seed: `pnpm seed:platform` → `admin@baliyo.ventures` / `***REMOVED***`

**Create tenant + brand admin** (platform session required):

`POST /tenants` `{ name, slug, tier, adminName, adminEmail, adminPassword }`

Credentials are emailed via Resend. Use `x-tenant-id` for platform impersonation.

## Modules (documented in Scalar)

`tenants` · `users` · `devices` · `products` · `locations` · `audio` · `commands` · `analytics` · `config` · `health` · WS `/realtime` · BullMQ workers stub · MQTT ingestion stub

## Env

See `.env.example` — notably `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `CORS_ORIGINS`, `FRONTEND_URL`, `DATABASE_URL`, `REDIS_URL`, `S3_*`, `MQTT_*`.
