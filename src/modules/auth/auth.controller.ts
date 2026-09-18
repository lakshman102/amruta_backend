import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../shared/errors/http-error.js';
import { AuthService } from './auth.service.js';
import { parseLoginInput, parseRegisterInput } from './auth.schemas.js';
import type { AuthenticatedRequest } from '../../shared/auth/authenticate.js';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(await this.service.register(parseRegisterInput(req.body))); }
    catch (error) { next(toValidationError(error)); }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(200).json(await this.service.login(parseLoginInput(req.body))); }
    catch (error) { next(toValidationError(error)); }
  };

  verifyMfa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as Record<string, unknown>;
      const challengeToken = typeof body.challengeToken === 'string' ? body.challengeToken : '';
      const code = typeof body.code === 'string' ? body.code : '';
      if (!challengeToken || !/^\d{6}$/.test(code)) throw new HttpError(400, 'Invalid MFA verification request');
      res.status(200).json(await this.service.verifyMfa(challengeToken, code));
    } catch (error) { next(error); }
  };

  setupMfa = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(200).json(await this.service.setupMfa(this.userId(req))); }
    catch (error) { next(error); }
  };

  enableMfa = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(200).json(await this.service.enableMfa(this.userId(req), this.code(req))); }
    catch (error) { next(error); }
  };

  disableMfa = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(200).json(await this.service.disableMfa(this.userId(req), this.code(req))); }
    catch (error) { next(error); }
  };

  private userId(req: Request): string {
    const user = (req as AuthenticatedRequest).user;
    if (!user) throw new HttpError(401, 'Authentication required');
    return user.id;
  }

  private code(req: Request): string {
    const code = (req.body as Record<string, unknown>).code;
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new HttpError(400, 'Invalid MFA code');
    return code;
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
