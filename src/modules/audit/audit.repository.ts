import type { Pool } from 'pg';

export type AuditLog = {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export class AuditRepository {
  constructor(private readonly db: Pool) {}

  async create(
    actorUserId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [actorUserId, action, entityType, entityId, JSON.stringify(sanitizeMetadata(metadata))],
    );
  }

  async list(filters: {
    action?: string;
    entityType?: string;
    actorUserId?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: AuditLog[]; hasMore: boolean }> {
    const offset = (filters.page - 1) * filters.pageSize;
    const values: unknown[] = [];
    const conditions: string[] = [];

    if (filters.action) { values.push(filters.action); conditions.push(`action = $${values.length}`); }
    if (filters.entityType) { values.push(filters.entityType); conditions.push(`entity_type = $${values.length}`); }
    if (filters.actorUserId) { values.push(filters.actorUserId); conditions.push(`actor_user_id = $${values.length}`); }

    values.push(filters.pageSize + 1, offset);
    const limitParam = values.length - 1;
    const offsetParam = values.length;
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.db.query<AuditLog>(
      `SELECT id, actor_user_id AS "actorUserId", action, entity_type AS "entityType",
              entity_id AS "entityId", metadata, created_at AS "createdAt"
       FROM audit_logs ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    );

    const hasMore = result.rows.length > filters.pageSize;
    return { items: hasMore ? result.rows.slice(0, filters.pageSize) : result.rows, hasMore };
  }
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const blocked = /password|token|secret|authorization|mfa|credential|card|cvv|cvc/i;
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !blocked.test(key)));
}
