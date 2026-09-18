import { Router } from 'express';
import type { Pool } from 'pg';
import { createAuthRoutes } from '../../modules/auth/auth.routes.js';
import { createAvailabilityRoutes } from '../../modules/availability/availability.routes.js';
import { createBookingRoutes } from '../../modules/booking/booking.routes.js';
import { createConsultationRoutes } from '../../modules/consultation/consultation.routes.js';
import { createSearchRoutes } from '../../modules/search/search.routes.js';
import { createPaymentRoutes } from '../../modules/payment/payment.routes.js';
import { createAuditRoutes } from '../../modules/audit/audit.routes.js';
import { createAnalyticsRoutes } from '../../modules/analytics/analytics.routes.js';
import { metrics } from '../../shared/observability/metrics.js';

export function createRoutes(db: Pool): Router {
  const router = Router();

  router.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  router.get('/metrics', (_req, res) => {
    res.type('text/plain; version=0.0.4').send(metrics.prometheus());
  });

  router.use('/auth', createAuthRoutes(db));
  router.use('/', createAvailabilityRoutes(db));
  router.use('/', createBookingRoutes(db));
  router.use('/', createConsultationRoutes(db));
  router.use('/', createSearchRoutes(db));
  router.use('/', createPaymentRoutes(db));
  router.use('/', createAuditRoutes(db));
  router.use('/', createAnalyticsRoutes(db));

  router.get('/ready', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.status(200).json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'not_ready' });
    }
  });

  return router;
}
