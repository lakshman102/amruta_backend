export type SearchDoctorsInput = {
  query: string | null;
  availabilityStatus: 'available' | 'unavailable' | null;
  availableFrom: string | null;
  availableTo: string | null;
  page: number;
  pageSize: number;
};

const MAX_PAGE_SIZE = 50;
const MAX_QUERY_LENGTH = 100;

export function parseSearchDoctorsInput(query: unknown): SearchDoctorsInput {
  if (!query || typeof query !== 'object') {
    throw new Error('Invalid search parameters');
  }

  const input = query as Record<string, unknown>;
  const rawQuery = typeof input.q === 'string' ? input.q.trim() : '';
  const status = input.status;
  const rawFrom = typeof input.availableFrom === 'string' ? input.availableFrom.trim() : '';
  const rawTo = typeof input.availableTo === 'string' ? input.availableTo.trim() : '';

  if (rawQuery.length > MAX_QUERY_LENGTH) {
    throw new Error('Invalid search query');
  }

  let availabilityStatus: SearchDoctorsInput['availabilityStatus'] = null;
  if (status !== undefined) {
    if (status !== 'available' && status !== 'unavailable') {
      throw new Error('Invalid availability status');
    }
    availabilityStatus = status;
  }

  const availableFrom = parseOptionalTimestamp(rawFrom, 'availableFrom');
  const availableTo = parseOptionalTimestamp(rawTo, 'availableTo');

  if (availableFrom && availableTo && new Date(availableTo) <= new Date(availableFrom)) {
    throw new Error('Invalid availability time range');
  }

  const page = parsePositiveInteger(input.page, 1, 'page');
  const pageSize = parsePositiveInteger(input.pageSize, 20, 'pageSize');

  if (pageSize > MAX_PAGE_SIZE) {
    throw new Error('Invalid pageSize');
  }

  return {
    query: rawQuery ? rawQuery.toLowerCase() : null,
    availabilityStatus,
    availableFrom,
    availableTo,
    page,
    pageSize,
  };
}

function parseOptionalTimestamp(value: string, name: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${name}`);
  }
  return date.toISOString();
}

function parsePositiveInteger(value: unknown, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`Invalid ${name}`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${name}`);
  }

  return parsed;
}
