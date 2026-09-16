#!/usr/bin/env bash
# Run Prisma generate + migrate deploy using current .env.
# Usage: bash scripts/prisma-migrate.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

PROVIDER="${DB_PROVIDER:-mysql}"
echo "DB_PROVIDER=$PROVIDER"

npx prisma generate
npx prisma migrate deploy

if [[ "${1:-}" == "--seed" ]]; then
  npm run seed:all || true
fi

echo "Done."
