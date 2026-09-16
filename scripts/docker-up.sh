#!/usr/bin/env bash
# Build and start the Marketplace Docker stack.
# Usage: bash scripts/docker-up.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed." >&2
  exit 1
fi

if [[ -f docker-compose.yml ]]; then
  docker compose up --build -d
  docker compose ps
elif [[ -f deployment/docker-compose.yml ]]; then
  docker compose -f deployment/docker-compose.yml up --build -d
  docker compose -f deployment/docker-compose.yml ps
else
  echo "No docker-compose.yml found." >&2
  exit 1
fi

echo
echo "Frontend: http://localhost:3000"
echo "API:      http://localhost:4000/api/health"
echo "Guide:    docs/docker.md"
