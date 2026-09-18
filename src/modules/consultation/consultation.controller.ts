import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/auth/authenticate.js';
import { HttpError } from '../../shared/errors/http-error.js';
import {
  parseConsultationId,
  parseCreatePrescriptionInput,
  parseUpdateConsultationStatusInput,
} from './consultation.schemas.js';
import { ConsultationService } from './consultation.service.js';

export class ConsultationController {
  constructor(private readonly service: ConsultationService) {}

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = this.user(req);
      const consultationId = this.param(req, 'consultationId');
      const input = parseUpdateConsultationStatusInput(req.body);

      res.status(200).json(
        await this.service.updateStatus(
          consultationId,
          user.id,
          user.role,
          input.status,
        ),
      );
    } catch (error) {
      next(toValidationError(error));
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = this.user(req);
      const consultationId = this.param(req, 'consultationId');

      res.status(200).json(
        await this.service.get(consultationId, user.id, user.role),
      );
    } catch (error) {
      next(toValidationError(error));
    }
  };

  createPrescription = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = this.user(req);
      const consultationId = this.param(req, 'consultationId');
      const input = parseCreatePrescriptionInput(req.body);

      res.status(201).json(
        await this.service.createPrescription(
          consultationId,
          user.id,
          input,
        ),
      );
    } catch (error) {
      next(toValidationError(error));
    }
  };

  listPrescriptions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = this.user(req);
      const consultationId = this.param(req, 'consultationId');

      res.status(200).json({
        prescriptions: await this.service.listPrescriptions(
          consultationId,
          user.id,
          user.role,
        ),
      });
    } catch (error) {
      next(toValidationError(error));
    }
  };

  private user(req: Request): { id: string; role: string } {
    const user = (req as AuthenticatedRequest).user;
    if (!user) throw new HttpError(401, 'Authentication required');
    return user;
  }

  private param(req: Request, name: string): string {
    const value = req.params[name];
    if (!value || Array.isArray(value)) {
      throw new HttpError(400, `Invalid ${name}`);
    }
    return parseConsultationId(value);
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
