# Marketplace hosting guide

This backend (Express + Prisma) and the customer Next.js app can be hosted in three ways. Pick one:

- [Vercel](./vercel-deployment.md) — you only have a domain (`marketplace.devminds.net`) and no VPS. Redis / Elasticsearch / Socket.IO are forced **off** (`HOSTING_PLATFORM=vercel`).
- [Docker Compose](./docker.md) — full stack (MySQL, Redis, ES) on one machine. Redis/ES **on** if compose provides them.
- [Ubuntu server](./ubuntu.md) — VPS with nginx + Node/PM2. Redis/ES **on** if you install them.

Scripts live in [`../scripts`](../scripts).

- Domain: `https://marketplace.devminds.net`
- Backend on Vercel is reached at `https://marketplace.devminds.net/backend` (Next.js rewrite). Express routes stay under `/api`, so health is `/backend/api/health`.
- Backend on Docker/Ubuntu is usually `http://SERVER:4000/api` or a reverse-proxied path.

First-run launcher (writes `.env` + `.stack.lock`, then starts both apps):

```bash
npm run stack
# reuse existing .env on later runs
npm run setup:defaults   # local SQLite, Redis off, ES off, no wizard
```
