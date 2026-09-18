import { Router } from 'express';
import type { Pool } from 'pg';
import { createAuthenticateMiddleware } from '../../shared/auth/authenticate.js';
import { authorize } from '../../shared/auth/authorize.js';
import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';

export function createAnalyticsRoutes(db: Pool): Router {
  const router = Router();
  const repository = new AnalyticsRepository(db);
  const service = new AnalyticsService(repository);
  const controller = new AnalyticsController(service);
  const authenticate = createAuthenticateMiddleware(db);

  router.get('/admin/analytics', authenticate, authorize('admin'), controller.getAnalytics);
  return router;
}
