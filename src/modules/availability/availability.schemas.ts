export type CreateAvailabilityInput = {
  startsAt: string;
  endsAt: string;
};

export type UpdateAvailabilityStatusInput = {
  status: 'available' | 'unavailable';
};

export function parseCreateAvailabilityInput(body: unknown): CreateAvailabilityInput {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');
  const input = body as Record<string, unknown>;
  const startsAt = typeof input.startsAt === 'string' ? input.startsAt.trim() : '';
  const endsAt = typeof input.endsAt === 'string' ? input.endsAt.trim() : '';

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (!startsAt || !endsAt || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error('Invalid availability time range');
  }

  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function parseUpdateAvailabilityStatusInput(body: unknown): UpdateAvailabilityStatusInput {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');
  const status = (body as Record<string, unknown>).status;
  if (status !== 'available' && status !== 'unavailable') throw new Error('Invalid availability status');
  return { status };
}
