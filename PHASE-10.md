# Phase 10 — Admin Analytics

## Implemented

- Added an admin-only analytics endpoint: `GET /api/admin/analytics`.
- Added PostgreSQL-side aggregate reporting for users, doctors, availability slots, consultations, and payments.
- Added optional `from` and `to` ISO timestamp filters for operational activity metrics.
- Added deterministic status aggregation for availability, consultations, and payments.
- Added completed payment amount aggregation.
- Preserved all validated Phase 1–9 fixes and security controls.
- Added a Phase 10 smoke test.

## API

`GET /api/admin/analytics`

Optional query parameters:

- `from` — ISO timestamp; activity on or after this time is included.
- `to` — ISO timestamp; activity before this time is included.

Only users with the `admin` role can access the endpoint.

## Response areas

- `users`: total and active users
- `doctors`: total and active doctors
- `availability`: counts by existing slot status
- `consultations`: total and counts by existing consultation status
- `payments`: total, counts by existing payment status, and completed payment amount

## Validation

```bash
npm run build
npm run db:migrate
npm run db:verify
npm run analytics:smoke
```

No new domain tables or unrelated analytics functionality were introduced.
