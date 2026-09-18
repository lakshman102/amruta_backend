# Phase 8 — Payments

## Status

Implemented on the validated Phase 7 baseline.

## Scope

Phase 8 implements the payments domain only to the extent required by the assignment's core system/data model and workflow. No payment-provider-specific functionality is introduced.

## Implemented

- Patient-authenticated payment creation for an owned consultation.
- Payment retrieval by consultation and payment ID for the patient or assigned doctor.
- PostgreSQL transaction boundary around payment creation.
- Consultation row locking to serialize concurrent payment creation for the same consultation.
- Idempotency through the `Idempotency-Key` request header.
- Duplicate payment protection through the existing one-payment-per-consultation constraint.
- Payment creation audit event in `audit_logs` within the same transaction.
- Input validation for amount, currency, consultation ID, payment ID, and idempotency key.
- Appropriate 4xx handling for missing consultations, authorization failures, duplicate payments, and idempotency conflicts.
- Smoke-test coverage for the core payment workflow.

## API

### Create payment

`POST /api/consultations/:consultationId/payments`

Requires patient authentication and an `Idempotency-Key` header.

Request body:

```json
{
  "amount": "500.00",
  "currency": "INR"
}
```

A newly created payment starts in `pending` status. The assignment does not specify a payment provider or external payment state machine, so no provider-specific status workflow is invented here.

### Get payment for consultation

`GET /api/consultations/:consultationId/payments`

Accessible to the consultation's patient or assigned doctor.

### Get payment by ID

`GET /api/payments/:paymentId`

Accessible to the payment's consultation patient or assigned doctor.

## Idempotency and Concurrency

The payment creation transaction:

1. Checks for an existing idempotency key.
2. Locks the target consultation row with `FOR UPDATE`.
3. Confirms the authenticated patient owns the consultation.
4. Confirms no payment already exists for the consultation.
5. Creates the payment.
6. Writes the payment audit event.
7. Commits both records atomically.

The existing unique `payments.consultation_id` constraint remains the database-level protection against multiple payments for one consultation. The idempotency-key unique index protects retry behavior.

## Failure / Retry Behavior

- Same patient + same idempotency key + same consultation: returns the original payment as an idempotent replay.
- Same consultation + different idempotency key after a payment exists: returns `409`.
- Same idempotency key used for a different payment request: returns `409`.
- Transaction failures roll back the payment and its audit event together.

## Assignment Mapping

- Core `payments` data model.
- Idempotency for writes.
- Transaction management.
- Auditability.
- Input validation.
- Security/RBAC.
- Reliability through safe retry behavior.

## Verification

Run:

```bash
npm run build
npm run db:migrate
npm run db:verify
npm run payment:smoke
```
