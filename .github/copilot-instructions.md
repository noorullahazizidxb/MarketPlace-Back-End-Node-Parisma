<!-- Based on/Inspired by: https://github.com/github/awesome-copilot -->
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
