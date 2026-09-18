# 5-Minute Interview Demo Guide

## 0:00–0:30 — Architecture

Show `ARCHITECTURE.md` and explain:

- Node.js/TypeScript REST API
- Modular domain structure
- PostgreSQL as the system of record
- Authentication/RBAC at protected boundaries
- Transactional booking/payment workflows
- Audit and observability layers

## 0:30–1:15 — Authentication

Run or demonstrate:

```bash
npm run auth:smoke
```

Explain:

- Patient registration
- Password hashing with scrypt
- JWT access tokens
- MFA foundation
- Role-based authorization

Do not expose real secrets during the demo.

## 1:15–2:15 — Availability + Booking

Run:

```bash
npm run availability:smoke
npm run booking:smoke
```

Focus on the important production behavior:

- Doctor availability validation
- Overlap protection
- PostgreSQL row locking
- Transactional booking
- Idempotency-Key
- Double-booking prevention

This is the strongest concurrency-focused part of the demo.

## 2:15–3:00 — Consultation + Payment

Run:

```bash
npm run consultation:smoke
npm run payment:smoke
```

Explain:

- Consultation lifecycle
- Prescription authorization
- Patient/doctor access boundaries
- Payment ownership
- Payment idempotency
- Duplicate-payment protection
- Payment audit event

## 3:00–3:45 — Security + Observability

Show:

```text
docs/SECURITY-CHECKLIST.md
docs/THREAT-MODEL.md
docs/DATA-CLASSIFICATION.md
docs/KEY-ROTATION.md
```

Then demonstrate:

```bash
npm run audit:smoke
npm run observability:smoke
```

Explain:

- MFA/RBAC
- Input validation/rate limiting
- Secret handling
- Audit trail
- Request correlation
- W3C Trace Context
- Prometheus-compatible metrics

## 3:45–4:30 — Analytics + Reliability

Run:

```bash
npm run analytics:smoke
npm run reliability:smoke
```

Explain:

- Admin-only aggregate analytics
- DB pool limits and timeouts
- Readiness failure behavior
- Bounded exponential backoff
- Backup/DR and partitioning/caching strategies

## 4:30–5:00 — Tests + CI/CD + close

Show:

```bash
npm test
npm run build
```

Then show `.github/workflows/ci.yml` and explain that CI performs:

1. PostgreSQL setup
2. Migration/verification
3. Type checking
4. Automated tests
5. Production build
6. Dependency audit
7. Docker build

Close with the engineering themes:

> The implementation focuses on correctness at the transaction boundary, safe concurrent writes, idempotency, authorization, auditability, and operational visibility while avoiding unnecessary product features.
