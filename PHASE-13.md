# Phase 13 — Tests & CI/CD

## Scope

Phase 13 adds repeatable automated tests and a CI pipeline while preserving the validated Phase 12 implementation.

## Automated tests

The project uses Node.js's built-in `node:test` runner with `tsx` for TypeScript execution. Tests cover:

- Exponential-backoff retry behavior.
- Retry attempt limits.
- Non-retryable failure handling.
- Booking request/idempotency-key validation.
- Payment amount/currency/idempotency-key validation.

The existing phase smoke scripts remain available for end-to-end workflow validation against PostgreSQL.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run build
```

Workflow smoke tests can be run individually with the existing `*:smoke` scripts.

## CI pipeline

`.github/workflows/ci.yml` runs on pushes and pull requests and performs:

1. PostgreSQL service startup with health checking.
2. `npm ci` for reproducible dependency installation.
3. Database migrations and schema verification.
4. TypeScript type checking.
5. Automated tests.
6. Production build.
7. High-severity-or-higher dependency audit failure gate.
8. Docker image build validation.

## Security and delivery controls

- CI secrets are represented only as non-production test values.
- Production secrets remain environment-managed and are not committed.
- Dependency installation uses the lockfile through `npm ci` when `package-lock.json` is present.
- The Docker image is built in CI to detect container build regressions.

## Assignment alignment

This phase addresses the assignment requirement for tests, CI, and containerized deployment validation without introducing a separate deployment platform or unrelated infrastructure.
