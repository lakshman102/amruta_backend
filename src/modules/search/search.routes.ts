import { Router } from 'express';
import type { Pool } from 'pg';
import { SearchController } from './search.controller.js';
import { SearchRepository } from './search.repository.js';
import { SearchService } from './search.service.js';

export function createSearchRoutes(db: Pool): Router {
  const router = Router();
  const repository = new SearchRepository(db);
  const service = new SearchService(repository);
  const controller = new SearchController(service);

  router.get('/doctors/search', controller.searchDoctors);

  return router;
}
