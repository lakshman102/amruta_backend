import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../shared/errors/http-error.js';
import type { AuthenticatedRequest } from '../../shared/auth/authenticate.js';
import { parseCreateAvailabilityInput, parseUpdateAvailabilityStatusInput } from './availability.schemas.js';
import { AvailabilityService } from './availability.service.js';

export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await this.service.create(this.userId(req), parseCreateAvailabilityInput(req.body)));
    } catch (error) {
      next(toValidationError(error));
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = this.param(req, 'doctorId');
      const status = req.query.status === undefined ? 'available' : req.query.status;
      if (status !== 'available' && status !== 'unavailable') {
        throw new HttpError(400, 'Invalid availability status filter');
      }
      res.status(200).json({ slots: await this.service.list(doctorId, status) });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await this.service.updateStatus(
        this.userId(req),
        this.param(req, 'slotId'),
        parseUpdateAvailabilityStatusInput(req.body),
      ));
    } catch (error) {
      next(toValidationError(error));
    }
  };

  private userId(req: Request): string {
    const user = (req as AuthenticatedRequest).user;
    if (!user) throw new HttpError(401, 'Authentication required');
    return user.id;
  }

  private param(req: Request, name: string): string {
    const value = req.params[name];
    if (!value || Array.isArray(value)) {
      throw new HttpError(400, `Invalid ${name}`);
    }
    return value;
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
