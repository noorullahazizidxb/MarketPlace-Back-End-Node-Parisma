---
applyTo: "**/*.js"
description: "JavaScript development standards for Node.js backend"
---
# JavaScript coding standards

Apply the repository-wide guidance from `../copilot-instructions.md` to backend code.

## General Guidelines
- Prefer clear, readable code over clever abstractions.
- Use async/await and handle errors via centralized middleware.
- Use camelCase for variables and functions; PascalCase for constructors.

## Module Structure
- Keep modules focused and small; group by feature (controllers, services, repositories).

## Testing
- Write unit tests for business logic and integration tests for important API flows.
