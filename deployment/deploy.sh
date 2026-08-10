#!/usr/bin/env bash
# LOCAL / LEGACY combined Marketplace+Jobs deploy.
# Production: use DevMinds platform (devminds-net + edge public-proxy).
# This stack must NOT bind host 0.0.0.0:80/443 when the edge gateway is running.
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

# Pull source trees referenced by env (if they are git checkouts)
# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

pull_if_git() {
  local dir="${1:-}"
  [[ -n "$dir" && -d "${dir}/.git" ]] || return 0
  echo "==> git pull --ff-only in ${dir}"
  git -C "$dir" pull --ff-only
}

pull_if_git "${MARKETPLACE_BACKEND_PATH:-}"
pull_if_git "${JOBS_BACKEND_PATH:-}"
pull_if_git "${MARKETPLACE_FRONTEND_PATH:-}"
pull_if_git "${JOBS_FRONTEND_PATH:-}"
pull_if_git "$SCRIPT_DIR"

FORCE_ARGS=()
for name in marketplace-mysql jobs-mysql shared-redis shared-elasticsearch \
  marketplace-backend jobs-backend marketplace-frontend jobs-frontend; do
  if docker inspect "$name" >/dev/null 2>&1; then
    echo "==> Existing container ${name} found — will force-recreate"
    FORCE_ARGS=(--force-recreate)
    break
  fi
done

echo "Building images..."
compose build

echo "Starting infrastructure (MySQL, Redis, Elasticsearch)..."
compose up -d "${FORCE_ARGS[@]}" mysql-marketplace mysql-jobs redis elasticsearch

echo "Starting backend containers..."
compose up -d "${FORCE_ARGS[@]}" marketplace-backend jobs-backend

echo "Running marketplace migrations and seeders..."
compose exec -T marketplace-backend sh -lc "npx prisma generate && npx prisma migrate deploy && node scripts/seedAdmin.js && node scripts/seedAll.js"

echo "Running jobs migrations and seeders..."
compose exec -T jobs-backend sh -lc "npx prisma generate && npx prisma migrate deploy && npm run seed"

echo "Reindexing search data..."
compose exec -T marketplace-backend sh -lc "if [ \"${ENABLE_ELASTIC_SEARCH:-false}\" = \"true\" ]; then node scripts/initUsersIndex.js || true; node scripts/reindex-blogs.js || true; node scripts/reindex-search.js || true; fi"
compose exec -T jobs-backend sh -lc "if [ -n \"${ELASTICSEARCH_URL:-}\" ]; then npm run reindex:es || true; fi"

echo "Starting frontend containers..."
compose up -d "${FORCE_ARGS[@]}" marketplace-frontend jobs-frontend

echo "Deployment completed (local/legacy). Prefer DevMinds ./scripts/dm.sh for production."
compose ps
