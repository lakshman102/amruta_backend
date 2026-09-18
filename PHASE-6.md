# Phase 6 — Consultation Lifecycle + Prescriptions

## Scope

Phase 6 adds the consultation lifecycle and prescription workflow using the existing `consultations` and `prescriptions` tables.

## Consultation lifecycle

Supported statuses:

- `scheduled`
- `in_progress`
- `completed`
- `cancelled`

Allowed transitions:

- Doctor: `scheduled -> in_progress`
- Doctor: `scheduled -> cancelled`
- Doctor: `in_progress -> completed`
- Doctor: `in_progress -> cancelled`
- Patient: `scheduled -> cancelled`

Invalid transitions return `409`.

## API

- `PATCH /api/consultations/:consultationId/status`
- `GET /api/consultations/:consultationId`
- `POST /api/consultations/:consultationId/prescriptions`
- `GET /api/consultations/:consultationId/prescriptions`

Only the assigned doctor can create prescriptions. Prescriptions require a completed consultation. Patients and the assigned doctor can retrieve consultation prescriptions.

## Database

Migration `005_consultation_lifecycle.sql` constrains consultation status to the supported lifecycle values.

## Validation

Run:

```bash
npm run db:migrate
npm run db:verify
npm run build
npm run auth:smoke
npm run consultation:smoke
```

The consultation smoke test exercises lifecycle authorization, completion, prescription creation/retrieval, and invalid transition handling.

The Phase 6 package also carries forward the validated Phase 3–5 fixes: CommonJS-safe auth smoke execution, callback-based `crypto.scrypt` password derivation, safe Express route-parameter narrowing, and preservation of existing `HttpError` status codes. Consultation authorization uses an inner join so row locking remains valid with PostgreSQL `FOR UPDATE`.
