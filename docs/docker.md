# Docker hosting — Marketplace API + Next.js

Use this when you want MySQL, Redis, Elasticsearch, Socket.IO, and local uploads on one host. `HOSTING_PLATFORM` stays `local` (default). Compose does **not** force Vercel overrides.

Existing compose files:

- [`../docker-compose.yml`](../docker-compose.yml) — Marketplace stack
- [`../deployment/docker-compose.yml`](../deployment/docker-compose.yml) — optional combined Marketplace + Jobs

## Quick start

```bash
cd MarketPlace-Back-End-Node-Parisma
bash scripts/docker-up.sh
```

Or: `npm run docker:up`

Redis and Elasticsearch remain optional: set `REDIS_ENABLED=false` / `SEARCH_ENABLED=false` in compose env if you do not want those add-ons.

## Ports (typical)

- Frontend (Next.js): 3000
- Backend (Express): 4000
- MySQL: 3306
- Redis: 6379
- Elasticsearch: 9200

Health: `http://localhost:4000/api/health`

See also the existing Docker notes in `deployment/` and `MarketPlace-Next-JS/docker-configuration/`.
