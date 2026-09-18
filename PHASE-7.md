# Phase 7 — Search & Filtering

## Scope

Phase 7 adds doctor search and filtering using the existing `users`, `profiles`, `doctors`, and `availability_slots` tables. No new domain table is introduced.

## API

`GET /api/doctors/search`

Query parameters:

- `q` — optional case-insensitive prefix search over doctor display name or email; max 100 characters.
- `status` — optional `available` or `unavailable` availability-slot status filter.
- `availableFrom` — optional ISO timestamp. Matching slots must start at or after this time.
- `availableTo` — optional ISO timestamp. Matching slots must end at or before this time.
- `page` — optional positive integer, default `1`.
- `pageSize` — optional positive integer, default `20`, maximum `50`.

Response contains `items`, `page`, `pageSize`, and `hasMore`.

Only active users with the `doctor` role are returned.

## Performance

Search is performed in PostgreSQL. Pagination uses `LIMIT/OFFSET` and deterministic ordering by normalized display name and doctor ID. Supporting indexes are added for normalized display names, normalized email, and doctor availability filtering.

## Validation

Invalid pagination values, unsupported availability status, invalid timestamps, reversed availability ranges, and overlong search strings return HTTP 400.

## Smoke test

Run:

```bash
npm run search:smoke
```

The smoke test covers basic search, filtering, pagination metadata, inactive-user exclusion, and validation.
