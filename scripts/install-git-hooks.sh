#!/bin/sh
# One-time per clone: use the repo's tracked hooks (.githooks/) so every commit is secret-scanned.
set -eu
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/*
echo "Git hooks enabled (core.hooksPath=.githooks). Commits are now scanned with gitleaks."
command -v gitleaks >/dev/null 2>&1 || echo "NOTE: install gitleaks too — 'brew install gitleaks' — or commits will be blocked."
