# Phase 5 — Booking

Implemented the assignment's consultation booking workflow with transactional concurrency control and idempotent writes.

## Endpoints

- `POST /api/consultations` — authenticated patients book an available slot.
- `GET /api/consultations/:consultationId` — authenticated patient or doctor retrieves an authorized consultation.

## Booking guarantees

- Requires `Idempotency-Key` header (1–128 characters).
- Uses a PostgreSQL transaction and `SELECT ... FOR UPDATE` on the availability slot.
- Prevents two patients from booking the same slot concurrently.
- Uses a unique `(patient_user_id, idempotency_key)` index to make retries idempotent.
- Marks the slot `unavailable` after the consultation is created, in the same transaction.
- The existing unique `consultations.availability_slot_id` constraint remains an additional database safeguard.

## Validation and authorization

- Booking is restricted to authenticated patients.
- Consultation retrieval is restricted to the consultation patient or the associated doctor.
- Invalid UUIDs and invalid/missing idempotency keys return `400`.
- Missing slots return `404`.
- Already booked/unavailable slots return `409`.

## Migration

`004_booking_idempotency.sql` adds the idempotency key to the existing `consultations` table and creates supporting indexes. No new domain table is introduced.
