import type { RequestHandler } from 'express';
import { HttpError } from '../errors/http-error.js';
import type { AuthenticatedRequest } from './authenticate.js';

export function authorize(...roles: string[]): RequestHandler {
  return (req, _res, next) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) return next(new HttpError(401, 'Authentication required'));
    if (!roles.includes(user.role)) return next(new HttpError(403, 'Forbidden'));
    return next();
  };
}
