export type ConsultationStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type UpdateConsultationStatusInput = {
  status: ConsultationStatus;
};

export type CreatePrescriptionInput = {
  content: string;
};

const allowedStatuses = new Set<ConsultationStatus>([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

export function parseUpdateConsultationStatusInput(body: unknown): UpdateConsultationStatusInput {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');

  const input = body as Record<string, unknown>;
  const status = typeof input.status === 'string' ? input.status.trim() : '';

  if (!allowedStatuses.has(status as ConsultationStatus)) {
    throw new Error('Invalid consultation status');
  }

  return { status: status as ConsultationStatus };
}

export function parseCreatePrescriptionInput(body: unknown): CreatePrescriptionInput {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');

  const input = body as Record<string, unknown>;
  const content = typeof input.content === 'string' ? input.content.trim() : '';

  if (!content || content.length > 10_000) {
    throw new Error('Invalid prescription content');
  }

  return { content };
}

export function parseConsultationId(value: string | undefined): string {
  if (!value || !isUuid(value)) throw new Error('Invalid consultationId');
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
