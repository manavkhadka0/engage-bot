# Engage Bot — instructions for Claude / coding agents

This is a **public** GitHub repository. Hard rules:

- **Never write a credential into any tracked file** — passwords, tokens, API keys, Wi-Fi SSID/password, MQTT
  tokens, cookies/secrets — not even "dev defaults", test values, or documentation examples. Use `${VAR}`
  references, `<placeholders>`, or blank template values, and read real values from untracked files
  (`engage-bot-backend/.env`, `esp_audio/main/secrets.h`). See `SECURITY.md`.
- Firmware credentials go in `esp_audio/main/secrets.h` (gitignored; template `secrets.example.h`) — never
  in `main.c`, READMEs or `sdkconfig.defaults`.
- Generate secrets with `pnpm setup:env` (random per machine); never invent memorable ones.
- Before committing, make sure the hook is on (`sh scripts/install-git-hooks.sh`) and gitleaks passes.
  Never bypass it (`SKIP_SECRET_SCAN`) to get a commit through.
- Don't commit business / proposal documents or third-party media; the README promises they stay private.
- The product is called **Engage Bot** (identifiers: `engage-bot-*`, DB/volumes `engage_bot_*`).
