<!-- Based on/Inspired by: https://github.com/github/awesome-copilot -->
# CodeGraph rules (mandatory)

This repo is indexed in `.codegraph/`. Never open, read, grep, or edit that folder. On every code question or edit, call `codegraph_explore` before any other search. Read `docs/feature-graph.md` and `.github/skills/codegraph/SKILL.md` for the symbol names to put in the query.

- Pass `projectPath` `D:\MarketPlace\MarketPlace-Back-End-Node-Parisma`.
- Read a file only when the graph names it, or when Codegraph returns nothing.
- Before changing a shared symbol, run `codegraph impact <symbol>` in this repo and list the callers.
- If `codegraph_explore` is missing, run `codegraph explore "<symbols>"` here.
- If Codegraph errors or returns nothing, say so, then use normal search.
- Diagrams are Mermaid from graph results. Mark anything unconfirmed.
- Do not guess how modules connect.

# MarketPlace Back End — Copilot Instructions

## Project Overview
This repository implements the Marketplace backend API and admin tooling. It provides REST and WebSocket APIs, background workers, scheduled jobs, and search/indexing using Prisma, PostgreSQL, and Redis.

## Tech Stack
- Node.js (ES modules)
- Express/Koa-style HTTP controllers
- Prisma ORM (PostgreSQL)
- Redis (caching, queues)
- WebSockets (real-time notifications)
- Worker processes & scheduled jobs

## Conventions
- Naming: use camelCase for variables and functions; PascalCase for classes and constructors.
- Structure: key source code lives in `src/` (controllers, services, repositories, middleware, routes). Keep files small and focused.
- Error handling: use centralized error middleware; return consistent JSON errors with an `error` key and HTTP status codes.
- Async: use async/await and bubble errors to the centralized handler.

## Workflow
- PRs: small, single-purpose PRs with descriptive titles and `feat/`, `fix/`, or `chore/` prefixes on branches.
- Tests: unit tests for services and repositories; integration tests for critical endpoints.
- Commits: follow a concise imperative style (e.g., "Add user registration validation").

## Reference Instruction Files
- Language guidelines: .github/instructions/javascript.instructions.md
- Testing: .github/instructions/testing.instructions.md
- Security: .github/instructions/security.instructions.md
- Documentation: .github/instructions/documentation.instructions.md
- Performance: .github/instructions/performance.instructions.md
- Code review: .github/instructions/code-review.instructions.md

Keep Copilot suggestions aligned with the repository's patterns: prefer small, testable functions, explicit error handling, and reuse of existing services/repositories.

## Atomic Design Imports

Always import at the atom level from shadcn and use proper atomic design layers: organism, molecules, templates.
- **Atoms**: `@/components/ui/atoms/shadcn/*` — smallest shadcn primitives (Button, Input, Badge, etc.)
- **Molecules**: `@/components/ui/molecules/*` — composed atoms (form groups, search bars, etc.)
- **Organisms**: `@/components/ui/organisms/*` — complex sections (theme-customizer, data tables, etc.)
- **Templates**: `@/components/ui/templates/*` — full page-level layouts
