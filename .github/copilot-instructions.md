## Marketplace — Copilot instructions (repo-specific)

Goal: help code-generation agents be productive immediately in this Node.js + Prisma + BullMQ + Elasticsearch project.

Key entry points

- App bootstrap: `src/index.js` — registers middleware, routes, queues and workers. Importing a worker file (e.g. `src/workers/*.js`) instantiates it.
- Config: `src/config/index.js` — authoritative env vars and service endpoints (Redis, Elasticsearch, PORT, tokens). Check here before hardcoding endpoints.
- Schema & DB: `prisma/schema.prisma` — Prisma models & enums (e.g. `Role`, `ListingStatus`). After modifying, run migrations and generate client.
- Queues: `src/jobs/queues.js` — centralized QUEUES constants and queue initialization (BullMQ + ioredis).
- Workers: `src/workers/*` — background processing (use `queues` values and `config.redisUrl`). See `notificationWorker.js` for example of delivery + prisma usage.

Developer workflows / commands (explicit)

- Start development server with hot reload: `npm run dev` (uses `nodemon src/index.js`).
- Start production-like server: `npm start`.
- Prisma: run migrations and update client after schema changes:
  - `npm run migrate` (runs `prisma migrate dev`)
  - `npm run generate` (runs `prisma generate`)
  - `npx prisma db pull` or `npx prisma migrate` as needed for advanced workflows.
- Reindex search / ES tasks:
  - `npm run reindex:all` — re-push listings into Elasticsearch (script: `scripts/reindex-search.js`).
  - `npm run init:users-index` — create users ES index.
- DB seeds: `npm run seed:all` (script: `scripts/seedAll.js`).
- Lint & format: `npm run lint`, `npm run format`.

Important architecture notes (why things are structured this way)

- HTTP API vs background jobs: API handlers in `src/controllers/*` call `services/*` and `repositories/*` for business logic and DB access. Time-consuming or external I/O tasks (search indexing, notifications, reminders) are pushed into BullMQ queues and handled by files in `src/workers/*`.
- Denormalized search index: `model SearchIndex` in Prisma is used as staging/versioning for Elasticsearch (`src/search/elasticsearch.js`) — keep ES pushes idempotent and versioned.
- Soft fail / optional infra: the server attempts to initialize Elasticsearch and will continue if ES is unavailable (see `src/index.js` startup warnings). Redis is expected for full functionality (queues & rate limits); code contains fallbacks (in-memory/LRU) in some places — check `README.redis.md`.

Project-specific patterns & conventions (concrete)

- Response helpers: middleware `src/middleware/responseWrapper.js` adds `res.apiSuccess()` and `res.apiError()` and must be mounted before auth. Use these helpers in generated controllers.
- Auth: `src/middleware/jwtAuth.js` provides `req.user`; `src/middleware/auth.js` exports `attachAuth`, `requireAuth`, and `requireRole(role)` helpers. Use `res.locals.entityName` in routes (see `src/routes/index.js`) to set the current resource name.
- Logging: use the `logger` from `src/utils/logger.js` (pino) for structured logs (logger.info, logger.warn, logger.error) rather than console.log.
- Queues: add new queue entries to `src/jobs/queues.js` (extend `QUEUES`) and ensure `initQueues()` initializes them. Worker files should create a `new Worker(queueName, handler, { connection })` and listen for failures with `QueueEvents`.
- Prisma relations & enums: don't assume DB enums in JS — refer to `prisma/schema.prisma` for canonical values (e.g. `ListingStatus`, `NotificationChannel`). Use Prisma client (`src/config/prisma.js`) for DB access.
- Notification delivery: follow `src/workers/notificationWorker.js` pattern — fetch `notification` with `recipients`, branch by `notification.channel` and mark `deliveredAt`/`deliveryError` on recipients and `sentAt` on notification.

Editing the DB model or adding fields

- Edit `prisma/schema.prisma` (see current enums & models). After changes:
  1. Run `npm run migrate` (or `npx prisma migrate dev --name your_change`).
  2. Run `npm run generate` (postinstall runs this by default, but run manually when testing).
  3. Update `repositories/*`, `services/*` and any `workers/*` that consume/produce denormalized `SearchIndex` or `Notification` data.

Testing & validation checklist for PRs

- Run lint and format: `npm run lint` and `npm run format`.
- Start the server locally (`npm run dev`) and validate the health endpoint: GET `/api/health` returns `{ ok: true }`.
- If touching queues/workers, start Redis and confirm `initQueues()` runs without warnings. If adding new workers, ensure you import them in `src/index.js` (workers are instantiated by importing their module).
- If touching search or ES mapping, run `npm run reindex:all` and check `src/search/elasticsearch.js` for index names (configurable via env vars).

Where to look for examples

- Route → controller → service → repository pattern: `src/routes/listings.js` -> `src/controllers/listingController.js` -> `src/services/listingService.js` -> `src/repositories/listingRepository.js`.
- Queue + worker pattern: `src/jobs/queues.js` + `src/workers/notificationWorker.js`.
- Notification sending adapters: `src/modules/notifications/*` and `src/modules/notifications/emailAdapter.js` / `whatsappAdapter.js`.

Agent rules / code style

- Keep changes minimal and focused; prefer small PRs that update one feature area.
- Use existing helpers: `res.apiSuccess`, `res.apiError`, `logger`, and `prisma` client from `src/config/prisma.js`.
- Preserve ES module syntax (import/export) and the project's use of `createRequire` where CommonJS-only libs are consumed (see `src/jobs/queues.js`).
- Do not hardcode secrets or URLs; read from `src/config/index.js` (env). If adding new env vars, document them in `README` or `src/config/index.js`.

If anything is ambiguous or you need privileged info (secrets, cloud indexes), ask a human — do not attempt network calls or secret access.

---

If you'd like, I can iterate on this file to include more examples (small code snippets) or add a short checklist for adding new API endpoints and migrations.
