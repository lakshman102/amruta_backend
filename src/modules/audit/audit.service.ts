import { AuditRepository } from './audit.repository.js';
import type { AuditListInput } from './audit.schemas.js';

export class AuditService {
  constructor(private readonly repository: AuditRepository) {}
  record(actorUserId: string | null, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown> = {}) {
    return this.repository.create(actorUserId, action, entityType, entityId, metadata);
  }
  list(input: AuditListInput) { return this.repository.list(input); }
}
