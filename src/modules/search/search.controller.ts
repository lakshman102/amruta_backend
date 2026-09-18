import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../shared/errors/http-error.js';
import { parseSearchDoctorsInput } from './search.schemas.js';
import { SearchService } from './search.service.js';

export class SearchController {
  constructor(private readonly service: SearchService) {}

  searchDoctors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = parseSearchDoctorsInput(req.query);
      res.status(200).json(await this.service.searchDoctors(input));
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
