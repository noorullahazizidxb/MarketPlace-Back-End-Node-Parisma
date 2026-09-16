#!/usr/bin/env bash
# Deploy backend then Marketplace Next.js to Vercel.
# Usage: bash scripts/deploy-vercel-all.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bash "$ROOT/scripts/deploy-vercel.sh"

FRONTEND="${FRONTEND_PATH:-}"
if [[ -z "$FRONTEND" ]]; then
  for candidate in "$ROOT/../MarketPlace-Next-JS"; do
    if [[ -f "$candidate/scripts/deploy-vercel.sh" ]]; then
      FRONTEND="$candidate"
      break
    fi
  done
fi

if [[ -n "${FRONTEND}" && -f "$FRONTEND/scripts/deploy-vercel.sh" ]]; then
  echo
  echo "Deploying Marketplace Next.js from $FRONTEND"
  bash "$FRONTEND/scripts/deploy-vercel.sh"
else
  echo "Frontend repo not found. Set FRONTEND_PATH or deploy it separately."
fi
