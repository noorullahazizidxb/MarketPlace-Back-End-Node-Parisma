#!/usr/bin/env bash
# Start (or restart) the Marketplace API with PM2.
# Usage: bash scripts/ubuntu-run.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Create .env first (cp .env.example .env)." >&2
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 not found. Run: sudo npm i -g pm2" >&2
  exit 1
fi

npx prisma generate

if pm2 describe marketplace-api >/dev/null 2>&1; then
  pm2 restart marketplace-api --update-env
else
  pm2 start src/index.js --name marketplace-api --time
fi

pm2 save
pm2 status marketplace-api
echo "Health: curl -s http://127.0.0.1:${PORT:-4000}/api/health"
