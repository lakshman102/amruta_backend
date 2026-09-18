import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCreateBookingInput } from '../src/modules/booking/booking.schemas.js';
import { parseCreatePaymentInput } from '../src/modules/payment/payment.schemas.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

test('booking validation accepts a valid UUID and idempotency key', () => {
  assert.deepEqual(
    parseCreateBookingInput({ availabilitySlotId: validUuid }, 'booking-1'),
    { availabilitySlotId: validUuid, idempotencyKey: 'booking-1' },
  );
});

test('booking validation rejects a missing idempotency key', () => {
  assert.throws(
    () => parseCreateBookingInput({ availabilitySlotId: validUuid }, undefined),
    /Invalid Idempotency-Key/,
  );
});

test('payment validation accepts amount and currency', () => {
  assert.deepEqual(
    parseCreatePaymentInput({ amount: 1250.5, currency: 'inr' }, 'payment-1'),
    { amount: '1250.5', currency: 'INR', idempotencyKey: 'payment-1' },
  );
});

test('payment validation rejects malformed amount', () => {
  assert.throws(
    () => parseCreatePaymentInput({ amount: '10.999', currency: 'INR' }, 'payment-1'),
    /Invalid payment amount/,
  );
});
