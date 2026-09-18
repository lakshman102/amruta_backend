import type { RequestHandler } from 'express';
import { HttpError } from '../errors/http-error.js';

export function createRateLimiter(windowMs: number, maxRequests: number): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (req, _res, next) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= maxRequests) return next(new HttpError(429, 'Rate limit exceeded'));
    bucket.count += 1;
    next();
  };
}
