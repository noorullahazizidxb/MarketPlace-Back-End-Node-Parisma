---
applyTo: "**/*.{js,ts}"
description: "Testing standards and practices"
---
# Testing Guidelines

- Unit tests: cover services and repositories; mock external services.
- Integration tests: verify critical API endpoints and database interactions.
- Test data: prefer fixtures and lightweight in-memory setups for fast runs.
- Run tests in CI and keep them fast and deterministic.
