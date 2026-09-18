import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../shared/errors/http-error.js';
import type { AuthenticatedRequest } from '../../shared/auth/authenticate.js';
import { AuditService } from './audit.service.js';
import { parseAuditListInput } from './audit.schemas.js';

export class AuditController {
  constructor(private readonly service: AuditService) {}
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.list(parseAuditListInput(req.query as Record<string, unknown>));
      res.status(200).json(result);
    } catch (error) {
      next(error instanceof Error ? new HttpError(400, error.message) : error);
    }
  };
}
