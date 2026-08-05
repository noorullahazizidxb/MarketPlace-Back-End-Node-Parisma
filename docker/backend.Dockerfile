# syntax=docker/dockerfile:1.7
# Builds the MarketPlace-Back-End-Node-Parisma backend from local source.

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /srv/backend

# ── deps ───────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# ── source ─────────────────────────────────────────────────────────────────
FROM deps AS source
COPY prisma ./prisma
COPY src    ./src
COPY scripts ./scripts
RUN npx prisma generate

# ── runtime entrypoint ─────────────────────────────────────────────────────
FROM source AS app
COPY --from=deps /srv/backend/node_modules ./node_modules

COPY <<'EOF' /usr/local/bin/entrypoint.sh
#!/bin/sh
set -eu
cd /srv/backend

npx prisma generate
npx prisma migrate deploy

if [ "${ENABLE_ELASTIC_SEARCH:-false}" = "true" ]; then
  node scripts/initUsersIndex.js   || true
  node scripts/reindex-blogs.js    || true
  node scripts/reindex-search.js   || true
fi

node scripts/seedAdmin.js  || true
node scripts/seedAll.js    || true

exec node src/index.js
EOF

RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
