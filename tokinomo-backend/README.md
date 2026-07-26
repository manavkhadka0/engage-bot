# Tokinomo Backend

Infra-first NestJS API for the Tokinomo multi-tenant fleet platform
(Baliyo Ventures × Xtreme). Domain modules come later — this scaffold wires
**Postgres/Timescale**, **Redis**, **MinIO**, **EMQX**, **Prisma**, and
**OpenAPI → Scalar docs**.

Architecture refs: [`../team/BACKEND_ARCHITECTURE.md`](../team/BACKEND_ARCHITECTURE.md),
[`../team/ARCHITECTURE.md`](../team/ARCHITECTURE.md),
[`../team/CONTRACTS.md`](../team/CONTRACTS.md).

## Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io) 9+
- Docker + Docker Compose

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm docker:up
pnpm prisma:generate
pnpm prisma:migrate   # first time: creates tables from schema
pnpm start:dev
```

| URL | What |
|---|---|
| http://localhost:3000/health | Liveness |
| http://localhost:3000/docs | Scalar API reference |
| http://localhost:3000/api-json | OpenAPI JSON (Frontend contract) |
| http://localhost:9001 | MinIO console (`tokinomo` / `***REMOVED***`) |
| http://localhost:18083 | EMQX dashboard (`admin` / `public`) |

## Scripts

| Script | Purpose |
|---|---|
| `pnpm start:dev` | Nest watch mode |
| `pnpm build` / `pnpm start:prod` | Production build + run |
| `pnpm docker:up` / `pnpm docker:down` | Compose infra |
| `pnpm prisma:generate` | Generate Prisma Client |
| `pnpm prisma:migrate` | Run / create migrations |
| `pnpm prisma:studio` | Prisma Studio |

## Layout

```
src/
  main.ts              # Swagger document + Scalar at /docs
  config/              # zod-validated env
  common/prisma/       # PrismaService (global)
  common/decorators/   # (later: @Roles, @CurrentTenant)
  common/filters/      # (later: zod pipes)
  health/              # GET /health
prisma/schema.prisma   # Data model from ARCHITECTURE §4
docker-compose.yml     # timescale · redis · minio · emqx
```

## Out of scope (ask to add next)

- BetterAuth + org tenancy + RLS
- Domain modules (devices, audio, …)
- MQTT ingestion worker + BullMQ jobs
- Resend mail sending (env placeholder ready: `RESEND_API_KEY`)

## Email

Transactional email will use **Resend** (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).
No local mail container.
