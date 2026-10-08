# Deploying Tokinomo — Hostinger VPS + Coolify + GitHub-built images

How the pieces fit:

```
git push main ──► GitHub Actions builds api / web / backup images ──► ghcr.io
                                                                          │ pull
Hostinger VPS (Coolify + Traefik, Let's Encrypt TLS) ◄────────────────────┘
  ├─ web      https://app.<domain>      (Next.js)
  ├─ api      https://api.<domain>      (NestJS + websocket)
  ├─ emqx     mqtts://mqtt.<domain>:8883 (devices)   ← Traefik terminates TLS
  ├─ postgres / redis                   (internal only)
  └─ backup   nightly pg_dump ─────────────────────────► Cloudflare R2
Cloudflare R2: audio clips + DB backups      Resend: transactional email
```

The whole stack is **one Docker Compose resource**: [`docker-compose.prod.yml`](../docker-compose.prod.yml)
(variables to fill in: [`.env.prod.example`](../.env.prod.example)). Nothing is built on the server.

**What was verified locally** (full production-shaped rehearsal, `docker-compose.prod.local.yml`):
the compose file, all three images, empty-database first boot + migrations, seed, `storage:check`,
backup + restore drill, and `scripts/prod-smoke.mjs` (21/21 steps).
**What only the real server can confirm:** Coolify's handling of this compose file, the MQTT-TLS route through
Traefik (§6), Cloudflare R2 itself, Resend delivery, and the GitHub Actions workflow (first run).
Each of those has a check below. Prices change — confirm at checkout.

## 0. What you need
| Item | Notes |
|---|---|
| Hostinger VPS | **KVM 2** (2 vCPU / 8 GB / 100 GB) recommended; KVM 1 (1 vCPU / 4 GB) is workable now that nothing is built on the box. Template **"Ubuntu 24.04 with Coolify"**. |
| Domain | Any registrar. Hostnames used below: `app.`, `api.`, `mqtt.`, `coolify.` + your domain. |
| Cloudflare account | R2 bucket (audio + backups). May ask for a card even on the free tier. |
| Resend account | Free tier; the sending **domain must be verified** or tenant emails won't deliver. |
| GitHub repo | Already set up (public). |

## 1. DNS
A records → the VPS IPv4: `app`, `api`, `mqtt`, `coolify`. If DNS is on Cloudflare keep them **DNS only**
(grey cloud) — the orange-cloud proxy breaks the MQTT port and websockets. Add Resend's SPF/DKIM records
once you add the domain in Resend.

## 2. Server (Hostinger)
1. Create the VPS with the Coolify template; add your SSH key; disable password SSH login.
2. **Firewalls — two layers, both must allow the port:** Hostinger hPanel firewall (default drops everything:
   add the SSH rule first) **and** the OS firewall (`sudo ufw status`). Allow **22** (ideally only your IP),
   **80**, **443**, **8883**. Port **8000** (Coolify's first-run UI) only until step 3, then close it.
   Everything else stays closed — postgres/redis/EMQX dashboard are not exposed.
3. Open `http://<ip>:8000`, create the admin account, then Settings → set the instance domain
   `https://coolify.<domain>`, enable 2FA. Close port 8000.

## 3. GitHub (builds the images)
Repo → Settings → Secrets and variables → Actions:
- **Variables:** `NEXT_PUBLIC_APP_URL=https://app.<domain>` and `NEXT_PUBLIC_API_URL=https://api.<domain>`
  (baked into the web image — changing the domain later means re-running the workflow).
- **Secrets** (optional, auto-redeploy): `COOLIFY_DEPLOY_WEBHOOK` (the resource's Deploy Webhook URL) and
  `COOLIFY_API_TOKEN` (Coolify → Keys & Tokens).
- Run **Actions → Build images → Run workflow**. It builds `tokinomo-api`, `tokinomo-web`, `tokinomo-backup`
  (linux/amd64) and pushes `:latest` and `:sha-<commit>` to `ghcr.io/<owner>/`.
  It refuses to build the web image if the two variables are missing or not `https://`.
- After the first run, make each of the 3 packages **public** (Package settings → Change visibility; they
  contain no secrets) — or `docker login ghcr.io` on the server with a `read:packages` token.

## 4. Cloudflare R2 (audio + backups)
1. R2 → **Create bucket** `tokinomo`. (Optional: Settings → Object lifecycle → expire prefix `backups/` after
   30 days; the backup job already prunes to 14 days itself.)
2. R2 → **Manage API tokens** → Object Read & Write, scoped to that bucket. Copy Access Key ID, Secret, and
   your Account ID.
3. You'll paste these into Coolify in §6 (`S3_ENDPOINT=S3_PUBLIC_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`,
   `S3_REGION=auto`). Verify them *before* deploying, from your laptop with the same variables in
   `tokinomo-backend/.env`: `pnpm storage:check` — all four lines must `PASS`.

Free-tier limits (at time of writing: 10 GB storage, 1M writes + 10M reads per month, no egress fees) — check
Cloudflare's pricing page. **Backblaze B2** works the same way: bucket-scoped Application Key,
`S3_ENDPOINT=https://s3.<region>.backblazeb2.com`, `S3_REGION=<region>`. The S3 client already sends no
unsupported checksums (`WHEN_REQUIRED`).
`S3_PUBLIC_ENDPOINT` is the host presigned download URLs carry to the **device**, so it must be reachable
from the ESP32 — R2/B2 are HTTPS, which the firmware downloader handles (Mozilla cert bundle).
No bucket CORS is needed (devices download, browsers don't).

> The `minio/minio` image is no longer pullable from Docker Hub or quay.io (checked 2026-10-08, even `latest`).
> MinIO exists only for local dev (`tokinomo-backend/docker-compose.yml`, works while the image is cached) —
> **never deploy it.**

## 5. Resend
Add your domain → add the DNS records it shows → wait for "Verified" → create an API key. Set
`RESEND_FROM_EMAIL=Tokinomo <noreply@<domain>>`.

## 6. Coolify
1. **New resource → Docker Compose** (public GitHub repo, branch `main`). Base directory `/`, compose file
   `/docker-compose.prod.yml`. In General, enable **Preserve repository during deployment** (EMQX's config
   file is bind-mounted from the repo).
2. **Environment variables:** everything in `.env.prod.example`. Coolify generates the
   `SERVICE_PASSWORD_64_*` secrets itself — leave them. `COOKIE_DOMAIN` must be the parent domain **with a
   leading dot** (e.g. `.example.com`): the session cookie is set on `app.` but the realtime websocket
   connects to `api.` and authenticates with it (without it live dashboards silently never update).
3. **Domains** (Coolify generates the Traefik rules): `api` → `https://api.<domain>:3000`,
   `web` → `https://app.<domain>:3001`. Don't publish host ports for either.
4. **MQTT over TLS — add the Traefik entrypoint (unverified until your first deploy).**
   Servers → *your server* → Proxy → Configuration: add to the `command:` list
   `- '--entrypoints.mqtts.address=:8883'` and to `ports:` `- '8883:8883'`, save, **restart the proxy**.
   `docker-compose.prod.yml` already labels `emqx` with a TCP router (`HostSNI(mqtt.<domain>)`, TLS via the
   `letsencrypt` resolver, forwarding plain MQTT to EMQX on 1883). If Traefik can't reach the container,
   add `traefik.docker.network=<the network shown by docker network ls for this resource>` to those labels.
   **Gate — don't touch devices until this passes:**
   ```bash
   openssl s_client -connect mqtt.<domain>:8883 -servername mqtt.<domain> </dev/null | grep -E 'Verify return|subject'
   ```
   (expect `Verify return code: 0 (ok)`). *Fallback if Coolify's proxy resists:* let EMQX terminate TLS itself
   (8883 listener + a Let's Encrypt cert from acme.sh via DNS-01, mounted read-only) — ask and I'll write it.
5. Deploy. The API container applies the database migrations on boot (empty database is fine).

## 7. First run
In Coolify's terminal for the `api` service (the image has no pnpm):
```bash
node_modules/.bin/tsx prisma/seed-platform.ts          # creates the platform owner from PLATFORM_EMAIL/PASSWORD
node_modules/.bin/tsx scripts/storage-check.ts         # R2 reachable from the server, 4x PASS
```
Log in at `https://app.<domain>` and change the password.

## 8. Verify (definition of done)
From your laptop (needs `pnpm install` in `tokinomo-backend` and `tokinomo-frontend`):
```bash
API_URL=https://api.<domain> APP_URL=https://app.<domain> MQTT_URL=mqtts://mqtt.<domain>:8883 \
PLATFORM_EMAIL=<you> PLATFORM_PASSWORD='<password>' REQUIRE_EMAIL=1 node scripts/prod-smoke.mjs
```
It signs in through the web app, checks the cookie reaches the API host, opens the realtime socket, creates a
throwaway tenant + device, logs the device into the **TLS** broker, uploads a 3.5 MB clip, pushes it,
downloads it from the presigned URL, then archives the test tenant. All steps must pass (`REQUIRE_EMAIL=1`
also proves Resend delivery — the welcome mail arrives at `you+smoke…@<domain>`).
Then, from outside the server, only 22/80/443/8883 should answer
(`nc -zv <ip> 5432 6379 9000 9001 18083` → all refused). Finally **reboot the VPS** and confirm everything
comes back by itself, and do one **backup restore drill** (below) before real data goes in.

## 9. Operating it
- **Deploy a change:** push to `main` → the workflow builds → (webhook) Coolify redeploys. Manual: Coolify →
  Redeploy (images use `pull_policy: always`).
- **Roll back:** set `IMAGE_TAG=sha-<good commit>` in Coolify and redeploy.
- **Backups:** the `backup` service dumps nightly (03:00 UTC, first one at start-up, keeps 14 days) to
  `s3://<bucket>/backups/`. In its terminal: `backup.sh list`, `backup.sh once`. **Restore drill** (always into
  an *empty* database, never the live one):
  ```bash
  # in the postgres service terminal: psql -U tokinomo -d postgres -c 'CREATE DATABASE restored'
  RESTORE_DATABASE_URL=postgresql://tokinomo:<password>@postgres:5432/restored \
    backup.sh restore backups/tokinomo-<timestamp>.sql.gz
  ```
- **EMQX dashboard / database admin** are loopback-only: `ssh -L 18083:127.0.0.1:18083 root@<ip>` then
  http://localhost:18083 (user `admin`, password = the generated `SERVICE_PASSWORD_64_EMQXDASHBOARD`).
- **Secrets:** all generated or set in Coolify; rotate by editing there and redeploying. Never reuse local dev values.
- **Tenant emails:** if the mail provider fails, the tenant is still created and the API returns `emailSent:false`.

## 10. Local development and rehearsal
- Day to day: `tokinomo-backend/docker-compose.yml` (infra) + `pnpm start:dev` / `pnpm dev`.
- Production rehearsal on your machine (builds the images from source, throwaway MinIO instead of R2):
  `docker compose -p tokinomo-prodtest --env-file <rehearsal.env> -f docker-compose.prod.yml -f docker-compose.prod.local.yml up -d --build`
  — see the header of `docker-compose.prod.local.yml`.
- EMQX config files: `emqx/emqx.conf` (backend on the host) vs `emqx/emqx.container.conf` (backend is the
  `api` service — used in production). EMQX reads the auth URLs only on the first boot of its data volume.

## 11. After hosting: firmware (not done yet)
The standalone hardware loop in `esp_audio/` doesn't use the network. To connect devices:
- `mqtt_ctl.c` sets only the broker URI and credentials — for `mqtts://` it needs the certificate bundle
  (`.broker.verification.crt_bundle_attach = esp_crt_bundle_attach`).
- TLS verification needs **correct wall-clock time**: start SNTP and wait for a valid time before the first MQTT /
  HTTPS connection, or every handshake fails with "certificate not yet valid".
- Per device you flash: Wi-Fi, broker `mqtts://mqtt.<domain>:8883`, serial, provisionToken, tenantId, deviceId
  (from `POST /devices/provision` + assign).

## 12. Known gaps
- Single server = single point of failure; acceptable for a pilot because of the backups.
- `team/BACKEND_ARCHITECTURE.md` mentions Postgres RLS and Timescale migrations that don't exist; tenant isolation
  is enforced in application code (unit-tested). Plain Postgres 16 is all production needs.
- Hostinger promo prices renew higher; longer prepaid terms are cheaper.
- GitHub Actions are pinned to major versions (`@v4`, `@v3`, `@v6`), not commit SHAs.
