# Phase 4 — Doctor Availability

Implemented the doctor availability flow on top of the Phase 2 core schema and Phase 3 authentication/RBAC.

## Implemented

- Doctor-only availability creation: `POST /api/doctors/availability`
- Availability retrieval: `GET /api/doctors/:doctorId/availability`
- Doctor-only status update: `PATCH /api/doctors/availability/:slotId/status`
- Input validation for ISO timestamps and `endsAt > startsAt`
- Duplicate-slot conflict handling
- PostgreSQL exclusion constraint preventing overlapping slots for the same doctor
- Authentication and `doctor` RBAC on mutations
- Repository/service/controller/route separation
- Availability smoke test

## Database change

Migration `003_availability_overlap.sql` enables `btree_gist` and adds a PostgreSQL exclusion constraint over `(doctor_id, [starts_at, ends_at))`. This makes overlap prevention database-enforced and safe under concurrent requests.

## Verification

Run:

```bash
npm run db:migrate
npm run db:verify
npm run build
npm run availability:smoke
```

The smoke test creates a temporary patient through the existing registration flow, promotes that test user to a doctor directly in the test database, obtains an access token, and verifies availability creation, retrieval, duplicate protection, validation, and status update. The direct role/doctor setup exists only for the smoke test because Phase 4 does not add a separate doctor-provisioning API.
