import express from 'express';
import type { Pool } from 'pg';
import { config } from './config/config.js';
import { createRoutes } from './infrastructure/http/routes.js';
import { errorHandler } from './shared/errors/error-handler.js';
import { createRateLimiter } from './shared/rate-limit/rate-limiter.js';
import { createAuditMiddleware } from './shared/observability/audit-middleware.js';
import { createRequestContextMiddleware } from './shared/observability/request-context.js';
import { createHttpObservabilityMiddleware } from './shared/observability/http-observability.js';

export function createApp(db: Pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(createRequestContextMiddleware());
  app.use(createHttpObservabilityMiddleware());
  app.use(createRateLimiter(config.rateLimitWindowMs, config.rateLimitMaxRequests));
  app.use(createAuditMiddleware(db));
  app.use('/api', createRoutes(db));
  app.use(errorHandler);
  return app;
}
