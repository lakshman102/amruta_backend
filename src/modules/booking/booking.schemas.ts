export type CreateBookingInput = {
  availabilitySlotId: string;
  idempotencyKey: string;
};

export function parseCreateBookingInput(body: unknown, idempotencyKeyHeader: string | undefined): CreateBookingInput {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');

  const input = body as Record<string, unknown>;
  const availabilitySlotId = typeof input.availabilitySlotId === 'string' ? input.availabilitySlotId.trim() : '';
  const idempotencyKey = typeof idempotencyKeyHeader === 'string' ? idempotencyKeyHeader.trim() : '';

  if (!isUuid(availabilitySlotId)) throw new Error('Invalid availabilitySlotId');
  if (!idempotencyKey || idempotencyKey.length > 128) throw new Error('Invalid Idempotency-Key');

  return { availabilitySlotId, idempotencyKey };
}

export function parseConsultationId(value: string | undefined): string {
  if (!value || !isUuid(value)) throw new Error('Invalid consultationId');
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
