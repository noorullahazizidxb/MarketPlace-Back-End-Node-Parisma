# Copilot instructions for this repo

Purpose: Give AI coding agents the essentials to work productively in this Node.js/Express + Prisma + Redis + BullMQ + Elasticsearch backend.

## Big picture

- Entry: `src/index.js` starts Express, attaches middlewares, registers routes, initializes Elasticsearch, queues, schedulers, and Socket.IO.
- Layers & flow (keep it): Route -> Controller -> Service -> Repository -> Prisma (DB).
  - Example: `src/routes/listings.js` -> `src/controllers/listingController.js` -> `src/services/listingService.js` -> `src/repositories/listingRepository.js` -> `src/config/prisma.js`.
- DB schema: Prisma models and enums in `prisma/schema.prisma` (MySQL). Use `@prisma/client` via `src/config/prisma.js` (singleton with query/error logging).
- Search: `src/search/elasticsearch.js` wraps the ES client, creates indices, provides helpers for users and listings.
- Jobs: `src/jobs/queues.js` (BullMQ + Redis) defines queues and `initQueues`; workers are instantiated by importing `src/workers/*.js` in `src/index.js`.
- Real-time: `src/websocket/socket.js` exposes `initWebsockets`, `emitToApprovals`, `emitToUser`. Admins join room `approvals`; users join `user:{id}`.

## Run and verify

- Scripts (see `package.json`):
  - Dev: `npm run dev` (nodemon).
  - Prisma: `npm run migrate`, `npm run generate` (also runs on postinstall).
  - Data: `npm run seed:all` to populate demo data (copies images into `uploads/`).
  - Search: `npm run reindex:all`, `npm run init:users-index`.
- Check services before running: `node scripts/checkServices.js` (pings Redis and ES using `src/config/index.js`).
- Required env (see `src/config/index.js`): `DATABASE_URL`, `REDIS_URL` (+ optional username/password), `ELASTICSEARCH_NODE`, `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD`, `TOKEN_SECRET`, and indices. Self-signed ES certs allowed when `ELASTICSEARCH_ALLOW_SELF_SIGNED` is truthy.

## API conventions

- Always use `responseWrapper` (`src/middleware/responseWrapper.js`): return via `res.apiSuccess(data, message, status)` or `res.apiError(message|error, status, details)`. Routes set `res.locals.entityName` for consistent payloads (see `src/routes/index.js`).
- Auth is attached globally via `jwtAuth` (`src/middleware/jwtAuth.js`); use `requireAuth` for protection. Tokens accepted from `Authorization: Bearer`, `x-access-token`, or `?token=`.
- Role checks: `requireRole(role)` exists, but many controllers guard explicitly with `req.user.roles.includes('ADMIN')`.
- Multipart uploads: Prefer `multer` with `upload.any()`; controllers parse JSON fields sent as strings in multipart (see `listingController.create` and `authController.registerUser`). Save files using `storage.saveTempTo` and persist URLs like `/uploads/...`; Express serves `app.use('/uploads', express.static(...))`.

## Data patterns

- Validation: Use Joi schemas under `src/validation/**` (e.g., `validation/listing.js`).
- Repository include shapes: Responses often include related entities (images, user roles, representatives, feedbacks). See `listingRepository.getById` and how controllers reload full entities before responding.
- Caching: Use `cachedResponse`/`redisGet`/`redisSet` (`src/utils/redisCache.js`) with Redis + in-memory LRU fallback. Key pattern example: `listing:${id}`.

## Search & indexing

- Elasticsearch client via `getES()`; indices created by `initSearch()`/`initUsersIndex()`. Listing indexing is performed asynchronously via queue `SEARCH_INDEX` with job names like `index-listing` (see `listingService` enqueue).
- Query patterns: `src/services/searchService.js` (bool query with filters, pagination, sort). Users search and suggestions provided in `src/search/elasticsearch.js`.

## Jobs & schedulers

- Queues defined in `src/jobs/queues.js` with `QUEUES` constants. Initialize once at startup.
- Recurring jobs scheduled in `src/schedulers/cron.js` using `repeat` with cron strings derived from `config.schedules`.

## Websockets

- Initialize once with the HTTP server. Handshake auth supports Bearer tokens; admins join `approvals` for live moderation (`listingController.forApproval` streams pending listings). Notify users via `emitToUser(userId, 'event', payload)`.

## When adding features

- Route: register under `src/routes/**`, set `res.locals.entityName` in `src/routes/index.js` for consistent responses.
- Controller: validate with Joi, parse multipart JSON fields if applicable, and return via `res.apiSuccess/apiError`.
- Service/Repo: keep business logic in services; DB access in repositories. Use Prisma include shapes consistent with existing endpoints.
- Side effects: enqueue BullMQ jobs via `queues[QUEUES.X].add(...)`; emit Socket.IO events via `socket.js` helpers; invalidate/update Redis caches as needed.
