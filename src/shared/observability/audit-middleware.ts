import type { RequestHandler } from 'express';
import type { Pool } from 'pg';
import { AuditRepository } from '../../modules/audit/audit.repository.js';
import type { AuthenticatedRequest } from '../auth/authenticate.js';

const ROUTE_ACTIONS: Record<string, { action: string; entityType: string; param?: string }> = {
  'POST /doctors/availability': { action: 'availability.created', entityType: 'availability_slot' },
  'PATCH /doctors/availability/:slotId/status': { action: 'availability.status_updated', entityType: 'availability_slot', param: 'slotId' },
  'POST /consultations': { action: 'consultation.created', entityType: 'consultation' },
  'PATCH /consultations/:consultationId/status': { action: 'consultation.status_updated', entityType: 'consultation', param: 'consultationId' },
  'POST /consultations/:consultationId/prescriptions': { action: 'prescription.created', entityType: 'prescription' },
};

export function createAuditMiddleware(db: Pool): RequestHandler {
  const repository = new AuditRepository(db);
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const user = (req as AuthenticatedRequest).user;
      const routePath = req.route?.path;
      const key = `${req.method.toUpperCase()} ${routePath ?? req.path}`;
      const definition = ROUTE_ACTIONS[key];
      if (!definition || !user) return;

      let entityId: string | null = null;
      if (definition.param) {
        const value = req.params[definition.param];
        entityId = typeof value === 'string' && !Array.isArray(value) ? value : null;
      } else if (key === 'POST /consultations') {
        const body = req.body as Record<string, unknown>;
        entityId = null;
        void repository.create(user.id, definition.action, definition.entityType, entityId, {
          availabilitySlotId: typeof body.availabilitySlotId === 'string' ? body.availabilitySlotId : undefined,
          statusCode: res.statusCode,
        }).catch(() => undefined);
        return;
      }

      void repository.create(user.id, definition.action, definition.entityType, entityId, {
        statusCode: res.statusCode,
      }).catch(() => undefined);
    });
    next();
  };
}
