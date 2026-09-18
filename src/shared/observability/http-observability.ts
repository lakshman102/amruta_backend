import type { RequestHandler } from 'express';
import { logger } from './logger.js';
import { metrics } from './metrics.js';

export function createHttpObservabilityMiddleware(): RequestHandler {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      metrics.recordHttp(res.statusCode, durationMs);
      logger.info('HTTP request completed', {
        requestId: res.locals.requestId,
        traceparent: res.locals.traceparent,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(3)),
      });
    });

    next();
  };
}
