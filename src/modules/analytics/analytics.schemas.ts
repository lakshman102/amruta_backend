export type AnalyticsInput = {
  from: string | null;
  to: string | null;
};

export function parseAnalyticsInput(query: unknown): AnalyticsInput {
  if (!query || typeof query !== 'object') throw new Error('Invalid analytics parameters');
  const input = query as Record<string, unknown>;
  const from = parseOptionalTimestamp(input.from, 'from');
  const to = parseOptionalTimestamp(input.to, 'to');

  if (from && to && new Date(to) <= new Date(from)) {
    throw new Error('Invalid analytics time range');
  }

  return { from, to };
}

function parseOptionalTimestamp(value: unknown, name: string): string | null {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error(`Invalid ${name}`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${name}`);
  return date.toISOString();
}
