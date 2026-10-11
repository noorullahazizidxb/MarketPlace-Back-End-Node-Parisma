# AF Marketplace API

REST and realtime API for the Afghanistan marketplace: listings, moderation, representatives, blogs, ads, stories, and notifications.

## Stack

- Node.js ESM, Express, entry `src/index.js`
- Prisma. Default schema is MySQL (`prisma/schema.prisma`). `prisma/schema.postgres.prisma` and `prisma/schema.sqlite.prisma` are the other schemas
- BullMQ and Redis, Socket.io, optional Elasticsearch
- JWT auth, Joi validation, Sharp image compression

## Features

Route wiring and the symbols to open first are in [docs/feature-graph.md](docs/feature-graph.md).

- Listings, images, renewal, and feedback
- Categories, representatives, users, and roles
- Auth, search, blogs, ads, stories, and contacts
- Admin reports and approval events over Socket.io
- Background workers started from `src/index.js`

## Run

```bash
npm install
npm run dev
```

`npm start` runs `node src/index.js`. Prisma helpers: `npm run generate`, `npm run migrate`. Local stack launcher: `npm run stack` (see [docs/README.md](docs/README.md)).

Hosting for Vercel, Docker, and Ubuntu is in [docs/README.md](docs/README.md). A longer module map is in [docs/project-overview.md](docs/project-overview.md).

## Agents

This repo has a local Codegraph index. Build or refresh it with `codegraph init` in this directory. Do not open `.codegraph/`.

On any code question, read [docs/feature-graph.md](docs/feature-graph.md) and call `codegraph_explore` with `projectPath` set to this repo before searching files. Cursor loads `.cursor/rules/codegraph.mdc`. Copilot loads the CodeGraph block in `.github/copilot-instructions.md` and `.github/skills/codegraph/SKILL.md`.
