import { Router } from 'express';
import type { Pool } from 'pg';
import { createAuthenticateMiddleware } from '../../shared/auth/authenticate.js';
import { authorize } from '../../shared/auth/authorize.js';
import { PaymentController } from './payment.controller.js';
import { PaymentRepository } from './payment.repository.js';
import { PaymentService } from './payment.service.js';

export function createPaymentRoutes(db: Pool): Router {
  const router = Router();
  const repository = new PaymentRepository(db);
  const service = new PaymentService(repository);
  const controller = new PaymentController(service);
  const authenticate = createAuthenticateMiddleware(db);

  router.post(
    '/consultations/:consultationId/payments',
    authenticate,
    authorize('patient'),
    controller.create,
  );

  router.get(
    '/consultations/:consultationId/payments',
    authenticate,
    authorize('patient', 'doctor'),
    controller.getByConsultationId,
  );

  router.get(
    '/payments/:paymentId',
    authenticate,
    authorize('patient', 'doctor'),
    controller.getByPaymentId,
  );

  return router;
}
