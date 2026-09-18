import { Router } from 'express';
import type { Pool } from 'pg';
import { AvailabilityRepository } from './availability.repository.js';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityController } from './availability.controller.js';
import { authorize } from '../../shared/auth/authorize.js';
import { createAuthenticateMiddleware } from '../../shared/auth/authenticate.js';

export function createAvailabilityRoutes(db: Pool): Router {
  const router = Router();
  const repository = new AvailabilityRepository(db);
  const service = new AvailabilityService(repository);
  const controller = new AvailabilityController(service);
  const authenticate = createAuthenticateMiddleware(db);
  const doctorOnly = [authenticate, authorize('doctor')];

  router.post('/doctors/availability', doctorOnly, controller.create);
  router.get('/doctors/:doctorId/availability', controller.list);
  router.patch('/doctors/availability/:slotId/status', doctorOnly, controller.updateStatus);

  return router;
}
