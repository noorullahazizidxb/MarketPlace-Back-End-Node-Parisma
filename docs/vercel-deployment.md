# Overall Vercel deployment — Marketplace API + Next.js

Two Vercel projects, one public domain: **`https://marketplace.devminds.net`**.

Vercel is serverless. Redis, Elasticsearch, Socket.IO, and BullMQ workers **cannot** stay always-on. Set `HOSTING_PLATFORM=vercel` on the API so those extras are forced off. You still need a **hosted SQL database** (Neon Postgres hobby is free). A SQLite file on Vercel will not persist.

```text
Browser  →  marketplace.devminds.net   (Next.js project + custom domain)
                │
                ├── /                  pages, assets
                ├── /api/*             Next.js route handlers
                └── /backend/*  ──rewrite──►  <api>.vercel.app   (Express project)
                                                    │
                                                    └── Neon Postgres (DATABASE_URL)
```

Public API base: `https://marketplace.devminds.net/backend/api` (Express mounts routes at `/api`).

## Local Vercel-like test (this PC)

Does **not** need a Vercel login. Uses SQLite and the same flags as production (`HOSTING_PLATFORM=vercel`, Socket.IO off, `/backend` rewrite).

```bash
# from the backend repo — stop any existing :3000 / :4000 first
npm run setup:defaults
npm run dev:vercel
```

- Site: http://localhost:3000
- API through rewrite: http://localhost:3000/backend/api/health (`hostingPlatform: "vercel"`)
- Env files: `.env.vercel.local` in each repo

## 1. Prerequisites

- [Vercel account](https://vercel.com) and CLI: `npm i -g vercel`
- [Neon](https://neon.tech) (or any Postgres) connection string
- Domain `marketplace.devminds.net` DNS you can edit
- This backend repo and `MarketPlace-Next-JS`

## 2. Database (once)

```bash
export DB_PROVIDER=postgresql
export DATABASE_URL='postgresql://USER:PASSWORD@HOST-pooler/dbname?sslmode=require'
export DIRECT_URL='postgresql://USER:PASSWORD@HOST/dbname?sslmode=require'
bash scripts/prisma-migrate.sh
# optional:
npm run seed:all
```

## 3. Deploy the backend (this repo)

```bash
bash scripts/deploy-vercel.sh
```

In Vercel → **Settings → Environment Variables**, paste [`.env.vercel.example`](../.env.vercel.example):

- `HOSTING_PLATFORM=vercel`
- `DB_PROVIDER=postgresql`
- `DATABASE_URL` = Neon pooled URL (`-pooler` host)
- `DIRECT_URL` = Neon direct URL (no `-pooler`)
- `TOKEN_SECRET` / `JWT_SECRET`
- `CORS_ORIGIN=https://marketplace.devminds.net`
- `CRON_SECRET` (Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`)
- `BLOB_READ_WRITE_TOKEN` required for durable UI-context settings and persistent uploads

Build: `npm run build` (generates the Postgres client from `prisma/postgres/schema.prisma` when `DB_PROVIDER=postgresql`). Entry: `api/index.js`. Daily cleanup: cron `GET /api/maintenance/cleanup-expired`.

## 4. Deploy the frontend

```bash
bash scripts/deploy-vercel-all.sh
# or from MarketPlace-Next-JS:
bash scripts/deploy-vercel.sh
```

Attach **custom domain only to the Next.js project**. Set `BACKEND_VERCEL_URL` to the API `*.vercel.app` URL (no trailing slash). Frontend env: [MarketPlace-Next-JS `.env.vercel.example`](../../MarketPlace-Next-JS/.env.vercel.example).

## 5. DNS

`marketplace.devminds.net` is attached only to the Next.js project `marketplace-web`. Leave Hostinger nameservers on `ns1.dns-parking.com` and `ns2.dns-parking.com`.

In hPanel → DNS zone for `devminds.net`, replace the existing `marketplace` record (it currently CNAMEs to `devminds.net`) with:

- Type: `CNAME`
- Name: `marketplace`
- Target: `89a67bd7c8fcc305.vercel-dns-017.com`

Then run `npx vercel domains verify marketplace.devminds.net`.
