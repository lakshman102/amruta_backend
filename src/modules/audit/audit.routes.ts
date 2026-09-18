import { Router } from 'express';
import type { Pool } from 'pg';
import { AuditRepository } from './audit.repository.js';
import { AuditService } from './audit.service.js';
import { AuditController } from './audit.controller.js';
import { createAuthenticateMiddleware } from '../../shared/auth/authenticate.js';
import { authorize } from '../../shared/auth/authorize.js';

export function createAuditRoutes(db: Pool): Router {
  const router = Router();
  const repository = new AuditRepository(db);
  const service = new AuditService(repository);
  const controller = new AuditController(service);
  const authenticate = createAuthenticateMiddleware(db);
  router.get('/admin/audit-logs', authenticate, authorize('admin'), controller.list);
  return router;
}
