# Security & secrets policy

This repository is **public**. Nothing secret may ever be committed — not in code, docs, compose files,
comments, test fixtures, firmware, or commit messages.

## Where secrets live

| Secret | Lives in | Template (tracked) |
|---|---|---|
| Backend / local-infra secrets (DB, MinIO, EMQX, auth, platform owner) | `engage-bot-backend/.env` (untracked) | `engage-bot-backend/.env.example` |
| Wi-Fi credentials, device serial + provision token, broker address (firmware) | `esp_audio/main/secrets.h` (untracked) | `esp_audio/main/secrets.example.h` |
| Production secrets | Coolify environment variables / generated `SERVICE_PASSWORD_*` | `.env.prod.example` |
| CI secrets | GitHub → Settings → Secrets and variables → Actions | — |
| Frontend | only public `NEXT_PUBLIC_*` values (never a secret) | `engage-bot-frontend/.env.example` |

Local setup generates random per-machine values — nothing is shared or guessable:

```bash
sh scripts/install-git-hooks.sh        # once per clone: scans every commit with gitleaks
cd engage-bot-backend && pnpm setup:env  # creates .env with random local secrets
```

## Rules

1. **No password / token / key literals in tracked files** — including "dev defaults", "test" values and
   documentation examples. Use `${VAR}` references, `<placeholder>` text, or a template file.
2. **Firmware credentials only in `secrets.h`** (gitignored). Never `#define WIFI_PASSWORD "..."` in `main.c`.
3. New secret ⇒ add it to the matching template as a **blank** value or placeholder, and read it from the environment.
4. Don't paste secrets into issues, PRs, chat logs, screenshots, or commit messages.

## Safety nets (don't rely on them — rule 1 is the real defence)

- `.githooks/pre-commit` — blocks commits containing secrets (`.gitleaks.toml`: provider tokens, private keys,
  hard-coded firmware credentials, literal passwords in config).
- `.github/workflows/secret-scan.yml` — scans the full history on every push / PR.
- GitHub secret scanning + push protection (enabled in repo settings).

## If a secret leaks

1. **Rotate it first** — change the Wi-Fi password, regenerate the token/key, re-provision the device. Assume
   anything that was ever public is compromised, even briefly; removing it from git does not un-leak it.
2. Remove it from the repository **history**, not just the latest commit (`git filter-repo --replace-text`),
   then force-push. Forks and clones keep their own copies — rotation is what actually protects you.
3. Ask GitHub Support to purge cached commit views, and mark the alert resolved in GitGuardian / GitHub.
4. Add a rule or allowlist entry to `.gitleaks.toml` if the scanner missed it.
