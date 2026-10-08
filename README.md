# Engage Bot

Shelf-advertising robot for **Xtreme**, built by **Baliyo Ventures**.

## Team docs

Everything the build teams need lives in [`team/`](./team/).

Start here: **[Team Handbook](./team/TEAM_INDEX.md)**

| Area | Doc |
|------|-----|
| Product overview | [ENGAGE_BOT_MASTER.md](./team/ENGAGE_BOT_MASTER.md) |
| System architecture | [ARCHITECTURE.md](./team/ARCHITECTURE.md) |
| Contracts / interfaces | [CONTRACTS.md](./team/CONTRACTS.md) |
| Backend | [BACKEND_ARCHITECTURE.md](./team/BACKEND_ARCHITECTURE.md) |
| Frontend | [FRONTEND_ARCHITECTURE.md](./team/FRONTEND_ARCHITECTURE.md) |
| Electronics | [ELECTRONICS_ARCHITECTURE.md](./team/ELECTRONICS_ARCHITECTURE.md) |
| BOM | [ELECTRONICS_BOM.md](./team/ELECTRONICS_BOM.md) |
| Playbooks | [TEAM_PLAYBOOKS.md](./team/TEAM_PLAYBOOKS.md) |
| Sprint 01 | [SPRINT_01.md](./team/SPRINT_01.md) |

Business, pricing, and proposal docs are kept privately by the founders and are not in this repository.

## Getting started

```bash
sh scripts/install-git-hooks.sh          # once per clone: secret-scans every commit (needs `brew install gitleaks`)
cd engage-bot-backend && pnpm install
pnpm setup:env                          # creates .env with random local secrets (never committed)
```

Secrets policy: **[SECURITY.md](./SECURITY.md)** — nothing secret is ever committed; this repo is public.

## Backend

NestJS API scaffold: [`engage-bot-backend/`](./engage-bot-backend/) — see its README for Docker + Scalar docs.

## Frontend

Next.js + TanStack Query scaffold: [`engage-bot-frontend/`](./engage-bot-frontend/) — own git repo; see its README.
