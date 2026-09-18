export type CreatePaymentInput = {
  amount: string;
  currency: string;
  idempotencyKey: string;
};

export function parseCreatePaymentInput(
  body: unknown,
  idempotencyKeyHeader: string | undefined,
): CreatePaymentInput {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');

  const input = body as Record<string, unknown>;
  const amount = typeof input.amount === 'number'
    ? String(input.amount)
    : typeof input.amount === 'string'
      ? input.amount.trim()
      : '';
  const currency = typeof input.currency === 'string' ? input.currency.trim().toUpperCase() : '';
  const idempotencyKey = typeof idempotencyKeyHeader === 'string' ? idempotencyKeyHeader.trim() : '';

  if (!amount || !/^\d+(?:\.\d{1,2})?$/.test(amount)) {
    throw new Error('Invalid payment amount');
  }

  if (Number(amount) < 0 || !Number.isFinite(Number(amount))) {
    throw new Error('Invalid payment amount');
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Invalid payment currency');
  }

  if (!idempotencyKey || idempotencyKey.length > 128) {
    throw new Error('Invalid Idempotency-Key');
  }

  return { amount, currency, idempotencyKey };
}

export function parsePaymentId(value: string | undefined): string {
  if (!value || !isUuid(value)) throw new Error('Invalid paymentId');
  return value;
}

export function parseConsultationId(value: string | undefined): string {
  if (!value || !isUuid(value)) throw new Error('Invalid consultationId');
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
