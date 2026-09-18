import type { RequestHandler } from 'express';
import type { Pool } from 'pg';
import { config } from '../../config/config.js';
import { HttpError } from '../errors/http-error.js';
import { verifyToken } from './jwt.js';

export type AuthenticatedRequest = Parameters<RequestHandler>[0] & {
  user?: { id: string; role: string };
};

export function createAuthenticateMiddleware(db: Pool): RequestHandler {
  return async (req, _res, next) => {
    try {
      const header = req.header('authorization');
      if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Authentication required');

      const token = header.slice('Bearer '.length).trim();
      const payload = verifyToken(token, config.jwtSecret);
      if (!payload || payload.type !== 'access') throw new HttpError(401, 'Authentication required');

      const result = await db.query<{ id: string; role: string }>(
        'SELECT id, role FROM users WHERE id = $1 AND status = $2',
        [payload.sub, 'active'],
      );
      const user = result.rows[0];
      if (!user) throw new HttpError(401, 'Authentication required');

      (req as AuthenticatedRequest).user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
