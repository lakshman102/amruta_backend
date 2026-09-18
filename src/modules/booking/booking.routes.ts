import { Router } from 'express';
import type { Pool } from 'pg';
import { createAuthenticateMiddleware } from '../../shared/auth/authenticate.js';
import { authorize } from '../../shared/auth/authorize.js';
import { BookingController } from './booking.controller.js';
import { BookingRepository } from './booking.repository.js';
import { BookingService } from './booking.service.js';

export function createBookingRoutes(db: Pool): Router {
  const router = Router();
  const repository = new BookingRepository(db);
  const service = new BookingService(repository);
  const controller = new BookingController(service);
  const authenticate = createAuthenticateMiddleware(db);

  router.post('/consultations', authenticate, authorize('patient'), controller.create);
  router.get('/consultations/:consultationId', authenticate, authorize('patient', 'doctor'), controller.get);

  return router;
}
