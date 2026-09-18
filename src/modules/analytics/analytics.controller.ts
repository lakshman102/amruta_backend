import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../shared/errors/http-error.js';
import { parseAnalyticsInput } from './analytics.schemas.js';
import { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = parseAnalyticsInput(req.query);
      res.status(200).json(await this.service.getAnalytics(input));
    } catch (error) {
      next(toValidationError(error));
    }
  };
}

function toValidationError(error: unknown): unknown {
  if (error instanceof HttpError) return error;
  if (error instanceof Error && error.message.startsWith('Invalid ')) {
    return new HttpError(400, error.message);
  }
  return error;
}
