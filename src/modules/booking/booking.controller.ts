import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/auth/authenticate.js';
import { HttpError } from '../../shared/errors/http-error.js';
import { parseConsultationId, parseCreateBookingInput } from './booking.schemas.js';
import { BookingService } from './booking.service.js';

export class BookingController {
  constructor(private readonly service: BookingService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = this.user(req);
      const input = parseCreateBookingInput(req.body, req.header('idempotency-key'));
      const result = await this.service.create(user.id, input);
      res.status(result.idempotentReplay ? 200 : 201).json(result.consultation);
    } catch (error) {
      next(toValidationError(error));
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = this.user(req);
      const consultationIdParam = req.params.consultationId;
      if (!consultationIdParam || Array.isArray(consultationIdParam)) {
        throw new HttpError(400, 'Invalid consultationId');
      }
      const consultationId = parseConsultationId(consultationIdParam);
      res.status(200).json(await this.service.get(consultationId, user.id, user.role));
    } catch (error) {
      next(toValidationError(error));
    }
  };

  private user(req: Request): { id: string; role: string } {
    const user = (req as AuthenticatedRequest).user;
    if (!user) throw new HttpError(401, 'Authentication required');
    return user;
  }
}

function toValidationError(error: unknown): unknown {
  if (error instanceof HttpError) {
    return error;
  }

  return error instanceof Error && error.message.startsWith('Invalid ')
    ? new HttpError(400, error.message)
    : error;
}
