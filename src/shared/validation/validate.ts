import type { RequestHandler } from 'express';
import { HttpError } from '../errors/http-error.js';

export function validateJsonBody<T>(validator: (body: unknown) => body is T): RequestHandler {
  return (req, _res, next) => {
    if (!validator(req.body)) return next(new HttpError(400, 'Invalid request body'));
    next();
  };
}
