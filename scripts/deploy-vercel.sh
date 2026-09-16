#!/usr/bin/env bash
# Deploy this Marketplace API to Vercel production.
# First time: npx vercel login && npx vercel link
# Usage: bash scripts/deploy-vercel.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Repo: $ROOT"
echo "Env template: .env.vercel.example"
echo "Guide: docs/vercel-deployment.md"
echo

if ! npx vercel whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx vercel login" >&2
  exit 1
fi

npx vercel --prod --yes

echo
echo "Set BACKEND_VERCEL_URL on the Next.js project to this deployment URL."
echo "Health: https://<deployment>.vercel.app/api/health"
