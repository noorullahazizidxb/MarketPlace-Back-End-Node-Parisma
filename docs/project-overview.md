# MarketPlace Back-End — Project Overview

> Last updated: 2025
> Node.js (ESM) · Express · Prisma (MySQL) · BullMQ (Redis) · Socket.io · Elasticsearch

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [API Routes](#5-api-routes)
6. [Controllers](#6-controllers)
7. [Services & Repositories](#7-services--repositories)
8. [Middleware](#8-middleware)
9. [Background Workers](#9-background-workers)
10. [Scheduled Jobs (Cron)](#10-scheduled-jobs-cron)
11. [BullMQ Queues](#11-bullmq-queues)
12. [WebSocket Events](#12-websocket-events)
13. [Search (Elasticsearch)](#13-search-elasticsearch)
14. [Data Models (Prisma)](#14-data-models-prisma)
15. [Design Patterns](#15-design-patterns)
16. [Blog Lifecycle](#16-blog-lifecycle)
17. [Listing Lifecycle](#17-listing-lifecycle)

---

## 1. Architecture Overview

```
                           ┌──────────────────────────────┐
                           │     Next.js Frontend          │
                           │  (App Router / TypeScript)    │
                           └──────────────┬───────────────┘
                                          │ HTTPS REST + WebSocket
                           ┌──────────────▼───────────────┐
                           │      Express API Server       │
                           │  :4000  (Node.js ESM)         │
                           │                               │
                           │  ┌──────────┐ ┌───────────┐  │
                           │  │ Routers  │ │ Middleware │  │
                           │  └────┬─────┘ └───────────┘  │
                           │       │                       │
                           │  ┌────▼──────────────────┐   │
                           │  │ Controllers            │   │
                           │  └────┬──────────────────┘   │
                           │       │                       │
                           │  ┌────▼──────────────────┐   │
                           │  │ Services               │   │
                           │  └────┬──────────────────┘   │
                           │       │                       │
                           │  ┌────▼──────────────────┐   │
                           │  │ Repositories (Prisma)  │   │
                           │  └────┬──────────────────┘   │
                           └───────┼───────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
   ┌──────▼──────┐        ┌────────▼────────┐     ┌────────▼────────┐
   │   MySQL DB  │        │     Redis        │     │ Elasticsearch   │
   │  (Prisma)   │        │  (BullMQ+Cache)  │     │ (Search Index)  │
   └─────────────┘        └────────┬────────┘     └─────────────────┘
                                   │
                          ┌────────▼────────┐
                          │  BullMQ Workers  │
                          │  (Background     │
                          │   Processing)    │
                          └─────────────────┘
```

The application is a **single Express process** that:

- Serves REST API endpoints under `/api/*`
- Handles real-time admin approval via Socket.io (room: `approvals`)
- Handles per-user notifications via Socket.io (room: `user:{userId}`)
- Dispatches heavy work (notifications, search indexing, cleanup) to BullMQ workers
- Runs scheduled BullMQ repeatable jobs via cron-style scheduling

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ with ES Modules (`"type": "module"`) |
| HTTP Framework | Express 5 |
| ORM | Prisma (MySQL) |
| Queue/Jobs | BullMQ backed by Redis (ioredis) |
| Real-time | Socket.io |
| Search | Elasticsearch 8 (optional, falls back to DB) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| File Upload | multer → local `uploads/` directory |
| Image Compression | sharp via custom `compressUploads` middleware |
| Logging | pino |
| Validation | joi |
| Scheduler | BullMQ repeatable jobs (no separate cron daemon) |
| Social Auth | Google OAuth2, Facebook OAuth2 |

---

## 3. Project Structure

```
src/
├── index.js                  Entry point — starts Express + WebSocket + workers
├── config/
│   ├── index.js              All configuration from environment variables
│   └── prisma.js             Singleton Prisma client
├── constants/
│   └── enums.js              App-wide enumerations (statuses, roles, etc.)
├── controllers/              Route handlers (thin — delegate to services)
│   ├── authController.js
│   ├── listingController.js
│   ├── blogController.js
│   ├── adminController.js
│   ├── categoryController.js
│   ├── contactController.js
│   ├── notificationController.js
│   ├── renewController.js
│   ├── listingFeedbackController.js
│   └── adController.js / ...
├── services/                 Business logic
│   ├── listingService.js
│   ├── blogService.js
│   ├── authService.js
│   └── ...
├── repositories/             Prisma data access layer
│   ├── listingRepository.js
│   ├── blogRepository.js
│   └── ...
├── middleware/
│   ├── auth.js               JWT parsing (`attachAuth`), `requireAuth`, `requireAdmin`
│   ├── responseWrapper.js    Adds `res.apiSuccess()` and `res.apiError()` helpers
│   ├── rateLimit.js          express-rate-limit for `/api/*`
│   └── compressUploads.js    sharp recompression of uploaded images
├── routes/
│   ├── index.js              Registers all routers under `/api`
│   ├── listings.js
│   ├── blogs.js
│   ├── auth.js
│   ├── admin.js
│   └── ...
├── jobs/
│   └── queues.js             BullMQ Queue + Worker factory; QUEUES enum
├── workers/                  BullMQ worker implementations
│   ├── moderationWorker.js
│   ├── notificationWorker.js
│   ├── renewalReminderWorker.js
│   ├── contentCleanupWorker.js
│   ├── statusCleanupWorker.js
│   ├── renewalCleanupWorker.js
│   ├── feedbackWorker.js
│   ├── blogExpiryWorker.js
│   └── searchWorker.js       (loaded only if Elasticsearch enabled)
├── schedulers/
│   └── cron.js               Creates BullMQ repeatable/scheduled jobs on startup
├── search/
│   └── elasticsearch.js      ES client, index init, suggest, search helpers
├── notifications/            Notification creation helpers
├── websocket/
│   └── socket.js             Socket.io init; `emitToApprovals()`, `emitToUser()`
├── utils/
│   ├── logger.js             pino logger
│   ├── storage.js            File move/delete utilities
│   └── ...
└── validation/               joi validation schemas
    ├── listing.js
    ├── blog.js
    └── ...
```

---

## 4. Environment Variables

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `4000` | HTTP server port |
| `DATABASE_URL` | — | Prisma MySQL connection string |

### Redis / BullMQ

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_USERNAME` | `` | Redis ACL username |
| `REDIS_PASSWORD` | `` | Redis password |

### Auth

| Variable | Default | Description |
|----------|---------|-------------|
| `TOKEN_SECRET` | `dev_secret` | JWT signing secret |
| `GOOGLE_CLIENT_ID` | — | Google OAuth2 client ID |
| `FACEBOOK_APP_ID` | — | Facebook App ID |
| `FACEBOOK_APP_SECRET` | — | Facebook App secret |

### Elasticsearch

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_ELASTIC_SEARCH` | `true` | Enable/disable Elasticsearch (`false` = DB-only search) |
| `ELASTICSEARCH_NODE` | `https://localhost:9200` | Elasticsearch host |
| `ELASTICSEARCH_USERNAME` | `elastic` | ES username |
| `ELASTICSEARCH_PASSWORD` | — | ES password |
| `ELASTICSEARCH_INDEX` | `listings` | Index name for listings |
| `ELASTICSEARCH_USERS_INDEX` | `users` | Index name for users |
| `ELASTICSEARCH_BLOGS_INDEX` | `blogs` | Index name for blogs |
| `ELASTICSEARCH_ALLOW_SELF_SIGNED` | `true` | Accept self-signed TLS cert |

### Retention / Cleanup Days

| Variable | Default | Description |
|----------|---------|-------------|
| `LISTING_UNAPPROVED_DELETE_AFTER_DAYS` | `2` | Days before unapproved (PENDING) listings are deleted |
| `LISTING_RENEWAL_WINDOW_DAYS` | `14` | Days before expiry to send renewal reminder to listing owner |
| `BLOG_STORY_KEEP_DAYS` | `30` | Days approved blogs/stories are retained (content cleanup) |
| `SOLD_RENTED_CLEANUP_DAYS` | `90` | Days before SOLD/RENTED listings are archived/deleted |
| `DRAFT_CLEANUP_DAYS` | `30` | Days before DRAFT listings are automatically deleted |
| `FEEDBACK_REMINDER_DAYS` | `7` | Days after a listing goes SOLD/RENTED before requesting feedback |
| `BLOG_DEFAULT_EXPIRY_DAYS` | `90` | Days a blog stays active after approval |
| `NOTIFY_BLOG_OWNER_TO_RENEW_DAYS` | `7` | Days before blog expiry to start sending daily renewal reminders |

### Scheduled Job Times (HH:mm 24h)

| Variable | Default | Queue |
|----------|---------|-------|
| `DAILY_RENEWAL_EXPIRE_TIME` | `01:00` | `renewal-cleanup` |
| `DAILY_STATUS_CLEANUP_TIME` | `02:00` | `status-cleanup` |
| `DAILY_LISTING_CLEANUP_TIME` | `03:00` | `moderation-cleanup` |
| `DAILY_BLOG_STORY_CLEANUP_TIME` | `04:00` | `content-cleanup` |
| `DAILY_BLOG_EXPIRY_CHECK_TIME` | `05:00` | `blog-expiry` |
| `DAILY_RENEWAL_REMINDER_TIME` | `06:00` | `renewal-reminder` |
| `DAILY_FEEDBACK_REMINDER_TIME` | `08:00` | `feedback-reminder` |

---

## 5. API Routes

All routes are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | – | Register new user (email + password) |
| POST | `/login` | – | Login; returns JWT |
| POST | `/google` | – | Google OAuth2 sign-in |
| POST | `/facebook` | – | Facebook OAuth2 sign-in |
| GET | `/me` | ✓ | Get current authenticated user |
| POST | `/logout` | ✓ | Invalidate session |
| POST | `/change-password` | ✓ | Change password |

### Listings — `/api/listings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | – | List all APPROVED listings (public), supports `?q=` |
| GET | `/hidden` | – | List APPROVED listings with hidden seller contact |
| GET | `/pending` | ✓ | List PENDING listings (admin) |
| GET | `/for-approval` | ✓ | Real-time approval feed (WebSocket-backed) |
| GET | `/admin/all` | ✓ Admin | All listings with `?status=&q=&page=&limit=` |
| POST | `/for-approval/emit-all` | ✓ Admin | Force broadcast pending listings to admin room |
| POST | `/` | ✓ | Create listing (multipart/form-data) |
| GET | `/:id` | – | Get single listing |
| PUT | `/:id` | ✓ | Full update listing |
| PATCH | `/:id` | ✓ | Partial update listing |
| POST | `/:id` | ✓ | Update contact visibility + bind representatives |
| POST | `/:id/approve` | ✓ Admin | Approve listing |
| POST | `/:id/reject` | ✓ Admin | Reject listing |
| DELETE | `/:id` | ✓ | Delete listing (owner or admin) |

### Blogs — `/api/blogs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | – | List APPROVED blogs (public), supports `?q=` search |
| GET | `/pending` | ✓ Admin | List PENDING blogs |
| GET | `/admin/all` | ✓ Admin | All blogs with `?status=&q=&page=&limit=` |
| POST | `/pending/emit-all` | ✓ Admin | Broadcast pending blogs to admin room |
| POST | `/` | ✓ | Create blog (multipart/form-data) — auto-sets status PENDING |
| GET | `/:id` | – | Get single blog |
| PUT | `/:id` | ✓ Owner | Update blog |
| DELETE | `/:id` | ✓ Owner/Admin | Delete blog |
| POST | `/:id/renew` | ✓ Owner | Extend blog expiry by `BLOG_DEFAULT_EXPIRY_DAYS` |
| POST | `/:id/approve` | ✓ Admin | Approve blog; sets `expiresAt` |
| POST | `/:id/reject` | ✓ Admin | Reject blog |
| POST | `/:id/comments` | ✓ | Add comment |
| POST | `/:id/likes` | ✓ | Toggle like |
| POST | `/:id/shares` | ✓ | Increment share count |

### Categories — `/api/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | – | List all categories |
| POST | `/` | ✓ Admin | Create category |
| PUT | `/:id` | ✓ Admin | Update category |
| DELETE | `/:id` | ✓ Admin | Delete category |

### Users — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ Admin | List all users (admin) |
| GET | `/:id` | ✓ | Get user profile |
| PUT | `/:id` | ✓ | Update user profile |
| DELETE | `/:id` | ✓ Admin | Delete user (admin) |

### Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | List notifications for current user |
| PATCH | `/:id/read` | ✓ | Mark notification as read |
| PATCH | `/read-all` | ✓ | Mark all notifications read |

### Listing Feedbacks — `/api/feedbacks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | ✓ | Create feedback/review for a listing |
| GET | `/listing/:listingId` | – | Get feedbacks for a listing |

### Admin — `/api/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats` | ✓ Admin | Dashboard statistics (totals, queue stats, charts) |

### Other Routes

| Base | Description |
|------|-------------|
| `/api/renew` | Listing renewal endpoints |
| `/api/roles` | Role management (admin) |
| `/api/search` | Full-text search (Elasticsearch / DB fallback) |
| `/api/ads` | Advertisement management |
| `/api/stories` | Stories management |
| `/api/contacts` | Contact form submissions |
| `/api/themes` | UI theme management |
| `/api/representatives` | Sales representative directory |

### Health

```
GET /api/health  →  { ok: true }
```

---

## 6. Controllers

Controllers are thin request/response handlers. They:

1. Validate / extract request parameters
2. Delegate all business logic to the corresponding service
3. Return a standardized API response via `res.apiSuccess()` or `res.apiError()`

| Controller | Key Methods |
|-----------|-------------|
| `authController` | `register`, `login`, `googleAuth`, `facebookAuth`, `me`, `changePassword` |
| `listingController` | `create`, `get`, `listApproved`, `listPending`, `listAll`, `approve`, `reject`, `delete`, `update`, `patch` |
| `blogController` | `create`, `get`, `list`, `listPending`, `listAll`, `approve`, `reject`, `renew`, `delete`, `update`, `comment`, `like`, `share` |
| `adminController` | `stats` |
| `categoryController` | `list`, `create`, `update`, `delete` |
| `notificationController` | `list`, `markRead`, `markAllRead` |
| `listingFeedbackController` | `create`, `list` |
| `adController` | `create`, `list`, `get`, `update`, `delete` |

---

## 7. Services & Repositories

### Pattern

```
Controller  →  Service  →  Repository  →  Prisma/DB
```

**Services** contain business logic: validation, authorization checks, cross-entity operations, side effects (notifications, queue jobs).

**Repositories** are thin wrappers around Prisma queries. Each method maps to a database operation.

### Key Services

| Service | Responsibility |
|---------|---------------|
| `listingService` | Create/update/delete listings; approve/reject with notifications and WS emit; expiry logic |
| `blogService` | Create/update/delete blogs; approve (sets `expiresAt`); reject; renew; `listAll` for admin |
| `authService` | Registration, login, password hashing, JWT generation |
| `notificationService` | Create and deliver notifications (persists to DB + queues dispatch) |

### Key Repositories

| Repository | Methods |
|-----------|---------|
| `listingRepository` | `create`, `getById`, `update`, `delete`, `list(filters, opts)`, `findUnapprovedOlderThan` |
| `blogRepository` | `create`, `getById`, `list`, `listPending`, `listAll`, `listByIds`, `setStatus(id, status, extra)`, `update`, `addComment`, `toggleLike`, `toggleShare` |

---

## 8. Middleware

### `responseWrapper`

Adds two helpers to every response object:

```js
res.apiSuccess(data, message?, statusCode?)  // → { data, message }
res.apiError(message, statusCode?)           // → { error: message }
```

### `attachAuth`

Parses the `Authorization: Bearer <token>` header. If valid, sets `req.user` with `{ id, roles, email, ... }`. Does **not** reject unauthenticated requests — use `requireAuth` for that.

### `requireAuth`

Rejects with `401` if `req.user` is not set (token missing or invalid).

### `requireAdmin`

Rejects with `403` if `req.user.roles` does not include `'ADMIN'`.

### `apiRateLimiter`

Applies express-rate-limit to all `/api/*` routes. Configurable via environment.

### `compressUploads`

After multer saves files to `tmp/uploads`, this middleware uses **sharp** to:

- Recompress JPEG/PNG/WebP to reduce file size
- Convert to optimized formats
- Save the result to the final upload path

---

## 9. Background Workers

All workers are BullMQ `Worker` instances. They are imported (and therefore instantiated) at startup in `src/index.js`.

### `moderationWorker`

- **Queue**: `moderation-cleanup`
- **Trigger**: Scheduled daily at `DAILY_LISTING_CLEANUP_TIME` (03:00)
- **Logic**: Removes PENDING listings older than `LISTING_UNAPPROVED_DELETE_AFTER_DAYS` days. Notifies owner on deletion.

### `renewalReminderWorker`

- **Queue**: `renewal-reminder`
- **Trigger**: Scheduled daily at `DAILY_RENEWAL_REMINDER_TIME` (06:00)
- **Logic**: Finds listings approaching expiry (within `LISTING_RENEWAL_WINDOW_DAYS`), sends SYSTEM notification + WebSocket emit to listing owner.

### `contentCleanupWorker`

- **Queue**: `content-cleanup`
- **Trigger**: Scheduled daily at `DAILY_BLOG_STORY_CLEANUP_TIME` (04:00)
- **Logic**: Removes old approved blogs and stories beyond `BLOG_STORY_KEEP_DAYS`.

### `statusCleanupWorker`

- **Queue**: `status-cleanup`
- **Trigger**: Scheduled daily at `DAILY_STATUS_CLEANUP_TIME` (02:00)
- **Logic**: Deletes SOLD/RENTED listings older than `SOLD_RENTED_CLEANUP_DAYS` days; deletes DRAFT listings older than `DRAFT_CLEANUP_DAYS` days.

### `renewalCleanupWorker`

- **Queue**: `renewal-cleanup`
- **Trigger**: Scheduled daily at `DAILY_RENEWAL_EXPIRE_TIME` (01:00)
- **Logic**: Handles listing renewal expiry. Listings past their renewal window without renewal are archived or removed.

### `feedbackWorker`

- **Queue**: `feedback-reminder`
- **Trigger**: Scheduled daily at `DAILY_FEEDBACK_REMINDER_TIME` (08:00)
- **Logic**: Finds SOLD/RENTED listings where feedback has not been left; sends reminder notification to buyer/owner after `FEEDBACK_REMINDER_DAYS`.

### `blogExpiryWorker`

- **Queue**: `blog-expiry`
- **Trigger**: Scheduled daily at `DAILY_BLOG_EXPIRY_CHECK_TIME` (05:00)
- **Logic**:
  - **Phase 1 — Notify**: Finds APPROVED blogs where `expiresAt` is within the next `NOTIFY_BLOG_OWNER_TO_RENEW_DAYS` days. Sends a `BLOG_EXPIRY_REMINDER` SYSTEM notification + WebSocket emit to the blog author.
  - **Phase 2 — Delete**: Finds APPROVED/REJECTED blogs where `expiresAt ≤ now`. Hard-deletes (including Prisma cascade for comments). Removes `uploads/blogs/{id}` directory. Sends `BLOG_EXPIRED_DELETED` notification to author.

### `notificationWorker`

- **Queue**: `notification-dispatch`
- **Trigger**: On-demand (pushed by other workers/services)
- **Logic**: Reads notification job payload and dispatches email or push notification.

### `searchWorker`

- **Queue**: `search-index`
- **Trigger**: On-demand after listing create/update
- **Loaded only when**: `ENABLE_ELASTIC_SEARCH=true`
- **Logic**: Indexes updated listing data into Elasticsearch.

---

## 10. Scheduled Jobs (Cron)

`src/schedulers/cron.js` calls `scheduleRecurringJobs()` at startup. Each job is a BullMQ **repeatable job**. The schedule is expressed as a daily CRON where the time comes from config.

| Job Name | Queue | Default Time | Config Key |
|----------|-------|-------------|------------|
| `daily-renewal-expire` | `renewal-cleanup` | 01:00 | `DAILY_RENEWAL_EXPIRE_TIME` |
| `daily-status-cleanup` | `status-cleanup` | 02:00 | `DAILY_STATUS_CLEANUP_TIME` |
| `daily-moderation-cleanup` | `moderation-cleanup` | 03:00 | `DAILY_LISTING_CLEANUP_TIME` |
| `daily-content-cleanup` | `content-cleanup` | 04:00 | `DAILY_BLOG_STORY_CLEANUP_TIME` |
| `daily-blog-expiry-check` | `blog-expiry` | 05:00 | `DAILY_BLOG_EXPIRY_CHECK_TIME` |
| `daily-renewal-reminder` | `renewal-reminder` | 06:00 | `DAILY_RENEWAL_REMINDER_TIME` |
| `daily-feedback-reminder` | `feedback-reminder` | 08:00 | `DAILY_FEEDBACK_REMINDER_TIME` |

---

## 11. BullMQ Queues

Defined in `src/jobs/queues.js`:

```js
export const QUEUES = {
  MODERATION_CLEANUP:    'moderation-cleanup',
  SEARCH_INDEX:          'search-index',
  NOTIFICATION_DISPATCH: 'notification-dispatch',
  RENEWAL_REMINDER:      'renewal-reminder',
  CONTENT_CLEANUP:       'content-cleanup',
  STATUS_CLEANUP:        'status-cleanup',
  RENEWAL_EXPIRE:        'renewal-cleanup',
  FEEDBACK_REMINDER:     'feedback-reminder',
  BLOG_EXPIRY:           'blog-expiry',
};
```

Each queue is a BullMQ `Queue` connected to the same Redis instance. Workers consume from their respective queue. The `initQueues()` function must be called before workers start consuming.

---

## 12. WebSocket Events

The WebSocket server runs on the same HTTP server as the Express app.

### Rooms

| Room | Members | Purpose |
|------|---------|---------|
| `approvals` | Admin clients | Real-time pending content review |
| `user:{userId}` | Authenticated user | Personal notifications |

### Emitters

```js
// src/websocket/socket.js
emitToApprovals(event, data)     // → broadcasts to "approvals" room
emitToUser(userId, event, data)  // → broadcasts to "user:{userId}" room
```

### Events Emitted to Admin (`approvals` room)

| Event | Payload | Trigger |
|-------|---------|---------|
| `pending-listing:new` | listing object | New listing created |
| `listing:approved` | `{ id }` | Listing approved |
| `listing:rejected` | `{ id }` | Listing rejected |
| `pending-listings` | listing[] | Bulk emit of all pending listings |
| `pending-blog:new` | blog object | New blog submitted |
| `blog:approved` | `{ id }` | Blog approved |
| `blog:rejected` | `{ id }` | Blog rejected |

### Events Emitted to User (`user:{userId}` room)

| Event | Payload | Trigger |
|-------|---------|---------|
| `notification` | notification object | Any SYSTEM / action notification |
| `listing:approved` | `{ id, title }` | User's listing approved |
| `listing:rejected` | `{ id, title }` | User's listing rejected |
| `blog:approved` | `{ id, title }` | User's blog approved |
| `blog:expiry-reminder` | `{ blogId, expiresAt }` | Blog expiry approaching |
| `blog:expired-deleted` | `{ blogId }` | Blog expired and deleted |

---

## 13. Search (Elasticsearch)

When `ENABLE_ELASTIC_SEARCH=true`, the system uses Elasticsearch for:

- Full-text listing search (titles, descriptions, locations)
- User search
- Blog search

**Indices**:

- `listings` (default — customizable via `ELASTICSEARCH_INDEX`)
- `users` (customizable via `ELASTICSEARCH_USERS_INDEX`)
- `blogs` (customizable via `ELASTICSEARCH_BLOGS_INDEX`)

**Fallback**: When Elasticsearch is disabled or fails, all search operations fall back to Prisma `contains` queries (case-insensitive DB-level search).

---

## 14. Data Models (Prisma)

### Listing

```prisma
model Listing {
  id                 String   @id @default(cuid())
  title              String
  description        String?
  price              Decimal?
  currency           String?
  listingType        String?
  status             String   @default("PENDING")   // PENDING | APPROVED | REJECTED | ACTIVE | SOLD | RENTED | EXPIRED
  contactVisibility  String?                         // SHOW_SELLER | HIDE_SELLER
  location           String?
  expiresAt          DateTime?
  approvedAt         DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  userId             String
  categoryId         Int?
  user               User
  category           Category?
  images             ListingImage[]
  feedbacks          ListingFeedback[]
  representatives    ListingRepresentative[]
  notifications      Notification[]
}
```

### Blog

```prisma
model Blog {
  id        String      @id @default(cuid())
  title     String
  content   String?
  images    String[]    // JSON array of relative upload paths
  status    BlogStatus  @default(PENDING)   // PENDING | APPROVED | REJECTED
  likes     Int         @default(0)
  shares    Int         @default(0)
  likedBy   String[]
  sharedBy  String[]
  expiresAt DateTime?   // set when blog is approved
  renewedAt DateTime?   // updated when blog owner renews
  authorId  String
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  author    User
  comments  BlogComment[]

  @@index([expiresAt])
}
```

### User

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String?
  fullName  String?
  firstName String?
  lastName  String?
  photo     String?
  roles     Role[]
  // ... contacts, listings, blogs, notifications, etc.
}
```

### Notification

```prisma
model Notification {
  id           String   @id @default(cuid())
  type         String   // SYSTEM | ACTION | etc.
  triggerEvent String?  // BLOG_EXPIRY_REMINDER | BLOG_EXPIRED_DELETED | etc.
  message      String
  read         Boolean  @default(false)
  createdAt    DateTime @default(now())
  recipients   NotificationRecipient[]
}
```

---

## 15. Design Patterns

### Repository Pattern

All database access is isolated in `repositories/`. Services never call Prisma directly. This allows easy unit testing with mock repositories.

### Service Layer

Business logic lives exclusively in `services/`. Controllers are thin adapters between HTTP and the service layer. This enforces separation of concerns.

### Centralized Error Handling

All errors bubble up to the Express error middleware in `index.js`. Each route uses try/catch and returns `res.apiError()` with an appropriate HTTP status. Never expose raw error messages to the client.

### BullMQ Job Pattern

Workers use a standard structure:

```js
createWorker(QUEUES.QUEUE_NAME, async (job) => {
  // 1. Query DB for affected records
  // 2. Process each record
  // 3. Side effects (notifications, WebSocket emit, file cleanup)
});
```

### Response Envelope

All API responses are wrapped:

```json
// Success
{ "data": <payload>, "message": "OK" }

// Error
{ "error": "Not found" }
```

### Room-based WebSocket

Admin clients join the `approvals` room on connect. Per-user events are sent to `user:{userId}` rooms. This avoids broadcasting sensitive data globally.

---

## 16. Blog Lifecycle

```
User creates blog
       │
       ▼
  status: PENDING  ──────────────────────────────────────────┐
  (auto on create)                                           │
       │                                                     │
       ▼                                                     │
  WS: pending-blog:new → admin approvals room               │
       │                                                     ▼
  Admin reviews                                        Admin rejects
       │                                                     │
       ▼                                                     ▼
  POST /blogs/:id/approve                            status: REJECTED
       │                                             WS: blog:rejected
       ▼                                             Notification to author
  status: APPROVED
  expiresAt = now + BLOG_DEFAULT_EXPIRY_DAYS (90d)
  WS: blog:approved → admin + author
  Notification to author
       │
       │  ← daily blog-expiry worker runs at DAILY_BLOG_EXPIRY_CHECK_TIME
       │
  when (expiresAt - now) ≤ NOTIFY_BLOG_OWNER_TO_RENEW_DAYS (7d)
       │
       ▼
  BLOG_EXPIRY_REMINDER notification to author
  WS: blog:expiry-reminder
  (repeats daily until expired or renewed)
       │
  Author may call POST /blogs/:id/renew
       │                        │
       ▼                        ▼
  expiresAt extended      continues normally
  renewedAt = now
       │
  when expiresAt ≤ now
       │
       ▼
  Hard-delete blog (cascades: comments, likes, shares)
  Remove uploads/blogs/{id} directory
  BLOG_EXPIRED_DELETED notification to author
```

---

## 17. Listing Lifecycle

```
User creates listing
       │
       ▼
  status: PENDING
  WS: pending-listing:new → admin approvals room
       │
  Admin reviews (via /pendings page or /admin/manage-content-status)
       ├─ Approve → status: APPROVED, approvedAt = now
       │            WS: listing:approved → admin + owner
       │            Notification to owner
       │
       └─ Reject → status: REJECTED
                   WS: listing:rejected → admin + owner
                   Notification to owner

  Listing owner can update status:
  APPROVED → SOLD / RENTED
                │
                ▼
        Daily feedback-reminder worker
        asks buyer for review after FEEDBACK_REMINDER_DAYS

  Daily moderation-cleanup:
  PENDING listings older than LISTING_UNAPPROVED_DELETE_AFTER_DAYS → deleted

  Daily renewal-reminder:
  Listings expiring within LISTING_RENEWAL_WINDOW_DAYS → reminder sent

  Daily status-cleanup:
  SOLD/RENTED listings older than SOLD_RENTED_CLEANUP_DAYS → deleted
  DRAFT listings older than DRAFT_CLEANUP_DAYS → deleted
```
