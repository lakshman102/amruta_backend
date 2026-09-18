import { Router } from 'express';
import type { Pool } from 'pg';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { createAuthenticateMiddleware } from '../../shared/auth/authenticate.js';
import { AuditRepository } from '../audit/audit.repository.js';

export function createAuthRoutes(db: Pool): Router {
  const router = Router();
  const repository = new AuthRepository(db);
  const service = new AuthService(repository, new AuditRepository(db));
  const controller = new AuthController(service);
  const authenticate = createAuthenticateMiddleware(db);

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/mfa/verify', controller.verifyMfa);
  router.post('/mfa/setup', authenticate, controller.setupMfa);
  router.post('/mfa/enable', authenticate, controller.enableMfa);
  router.post('/mfa/disable', authenticate, controller.disableMfa);

  return router;
}
