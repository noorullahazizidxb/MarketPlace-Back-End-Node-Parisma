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

## Paid VPS cutover

Docker Compose stays on MySQL, Redis, and Socket.IO. Pointing the live domain at that host is an env and DNS change:

- API: `HOSTING_PLATFORM=local`, `DB_PROVIDER=mysql`, `DATABASE_URL=mysql://…`, `REDIS_ENABLED=true`, `SOCKET_IO_ENABLED=true`
- Web image build args: `NEXT_PUBLIC_API_BASE=https://marketplace.devminds.net/api`, `NEXT_PUBLIC_SOCKET_IO_ENABLED=true`
- DNS at Hostinger: remove the Vercel CNAME for `marketplace` and add an A record to the VPS address. Nginx on that host serves the site.
