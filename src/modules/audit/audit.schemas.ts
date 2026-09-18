export type AuditListInput = {
  action?: string;
  entityType?: string;
  actorUserId?: string;
  page: number;
  pageSize: number;
};

export function parseAuditListInput(query: Record<string, unknown>): AuditListInput {
  const page = parsePositiveInt(query.page, 1, 100000);
  const pageSize = parsePositiveInt(query.pageSize, 20, 100);
  const action = optionalText(query.action, 100);
  const entityType = optionalText(query.entityType, 50);
  const actorUserId = optionalUuid(query.actorUserId);
  return { action, entityType, actorUserId, page, pageSize };
}

function optionalText(value: unknown, max: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid audit filter');
  return value.trim();
}
function optionalUuid(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error('Invalid actorUserId');
  return value;
}
function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) throw new Error('Invalid audit pagination');
  return n;
}
