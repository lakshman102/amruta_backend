# Phase 1 — Project Foundation

Implemented foundation only; no business workflow has been added.

## Included
- TypeScript Node.js backend
- Express API foundation
- Dependency-injection-ready application composition (`createApp` receives its database dependency)
- Environment-based configuration
- PostgreSQL pool and startup connectivity check
- JSON input parsing foundation
- Generic validation middleware
- In-memory rate limiting foundation
- Consistent HTTP error handler
- Structured JSON logging foundation
- Health and readiness endpoints
- Graceful shutdown
- Dockerfile and local Docker Compose foundation

## Not included
User lifecycle, MFA/RBAC workflow, doctors, availability, booking, consultation, prescriptions, payments, search, analytics, full audit workflow, complete observability, CI/CD, threat model, and DR implementation.

## Run locally
1. Copy `.env.example` to `.env` and set values.
2. Start PostgreSQL.
3. Run `npm install`.
4. Run `npm run typecheck`.
5. Run `npm run dev`.

Or run the local stack with `docker compose up --build`.
