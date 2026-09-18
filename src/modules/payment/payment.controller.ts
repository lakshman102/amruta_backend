import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/auth/authenticate.js';
import { HttpError } from '../../shared/errors/http-error.js';
import {
  parseConsultationId,
  parseCreatePaymentInput,
  parsePaymentId,
} from './payment.schemas.js';
import { PaymentService } from './payment.service.js';

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = this.user(req);
      const consultationId = this.param(req, 'consultationId', parseConsultationId);
      const input = parseCreatePaymentInput(req.body, req.header('idempotency-key'));
      const result = await this.service.create(user.id, consultationId, input);
      res.status(result.idempotentReplay ? 200 : 201).json(result.payment);
    } catch (error) {
      next(toValidationError(error));
    }
  };

  getByPaymentId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = this.user(req);
      const paymentId = this.param(req, 'paymentId', parsePaymentId);
      res.status(200).json(await this.service.getByPaymentId(paymentId, user.id, user.role));
    } catch (error) {
      next(toValidationError(error));
    }
  };

  getByConsultationId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = this.user(req);
      const consultationId = this.param(req, 'consultationId', parseConsultationId);
      res.status(200).json(
        await this.service.getByConsultationId(consultationId, user.id, user.role),
      );
    } catch (error) {
      next(toValidationError(error));
    }
  };

  private user(req: Request): { id: string; role: string } {
    const user = (req as AuthenticatedRequest).user;
    if (!user) throw new HttpError(401, 'Authentication required');
    return user;
  }

  private param(
    req: Request,
    name: string,
    parser: (value: string | undefined) => string,
  ): string {
    const value = req.params[name];
    if (!value || Array.isArray(value)) {
      throw new HttpError(400, `Invalid ${name}`);
    }
    return parser(value);
  }
}

function toValidationError(error: unknown): unknown {
  if (error instanceof HttpError) return error;

  return error instanceof Error && error.message.startsWith('Invalid ')
    ? new HttpError(400, error.message)
    : error;
}
