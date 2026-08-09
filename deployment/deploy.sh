#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="${1:-$SCRIPT_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  echo "Create it from: $SCRIPT_DIR/.env.example"
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "Building images..."
compose build

echo "Starting infrastructure (MySQL, Redis, Elasticsearch)..."
compose up -d mysql-marketplace mysql-jobs redis elasticsearch

echo "Starting backend containers..."
compose up -d marketplace-backend jobs-backend

echo "Running marketplace migrations and seeders..."
compose exec -T marketplace-backend sh -lc "npx prisma generate && npx prisma migrate deploy && node scripts/seedAdmin.js && node scripts/seedAll.js"

echo "Running jobs migrations and seeders..."
compose exec -T jobs-backend sh -lc "npx prisma generate && npx prisma migrate deploy && npm run seed"

echo "Reindexing search data..."
compose exec -T marketplace-backend sh -lc "if [ \"${ENABLE_ELASTIC_SEARCH:-false}\" = \"true\" ]; then node scripts/initUsersIndex.js || true; node scripts/reindex-blogs.js || true; node scripts/reindex-search.js || true; fi"
compose exec -T jobs-backend sh -lc "if [ -n \"${ELASTICSEARCH_URL:-}\" ]; then npm run reindex:es || true; fi"

echo "Starting frontend containers..."
compose up -d marketplace-frontend jobs-frontend

echo "Deployment completed."
compose ps
