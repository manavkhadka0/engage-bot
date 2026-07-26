# Tokinomo Frontend

Next.js App Router console for Baliyo platform + brand workspaces.

## Stack

- Next.js 16 + React 19 + Tailwind 4
- Better Auth client (proxied via `/api/auth/*`)
- TanStack Query + typed `apiFetch` (proxied via `/api/be/*`)
- Socket.IO client for live device status
- Hallmark **Terminal** theme (JetBrains Mono, phosphor OKLCH)

## Routes

| Path | Who |
|---|---|
| `/` `/about` `/features` `/faqs` `/contact` | Public |
| `/login` | Auth |
| `/admin/*` | `PLATFORM_OWNER`, `PLATFORM_OPERATOR` |
| `/app/[tenantSlug]/*` | `BRAND_ADMIN`, `BRAND_STAFF`, `BRAND_VIEWER` |

## Dev

```bash
# Backend on :3000 first
pnpm --dir ../tokinomo-backend start:dev

# Frontend on :3001
pnpm install
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001).

Auth and REST are rewritten to the API so session cookies stay same-origin on `:3001`.
Ensure backend `CORS_ORIGINS` includes `http://localhost:3001` and
`BETTER_AUTH_URL` matches how you serve auth (with the proxy, `http://localhost:3001` is ideal).

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Dev server :3001 |
| `pnpm build` | Production build |
| `pnpm api:gen` | Regenerate OpenAPI types from backend `/api-json` |
