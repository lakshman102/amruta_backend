# Phase 9 — Compliance, Audit and Security

## Implemented

- Added a dedicated audit module and admin-only audit-log API.
- Added audit indexes for action/entity queries.
- Added automatic audit events for authenticated core workflow mutations.
- Added authentication/MFA security audit events.
- Preserved the existing payment creation audit event.
- Added audit metadata sanitization so secrets and credential-like fields are not persisted in audit metadata.
- Added security checklist, threat model, data classification, and key-rotation documentation.
- Documented encryption-at-rest/in-transit deployment requirements.
- Documented dependency scanning as a CI requirement for Phase 13.
- Preserved the validated Phase 8 implementation and earlier controller/security fixes.

## API

`GET /api/admin/audit-logs`

Query parameters:

- `action` (optional)
- `entityType` (optional)
- `actorUserId` (optional UUID)
- `page` (default 1)
- `pageSize` (default 20, maximum 100)

Only users with the `admin` role can access this endpoint.

## Validation

Run:

```bash
npm run build
npm run db:migrate
npm run db:verify
npm run audit:smoke
```
