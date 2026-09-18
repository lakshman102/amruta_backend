import { Router } from 'express';
import type { Pool } from 'pg';
import { createAuthenticateMiddleware } from '../../shared/auth/authenticate.js';
import { authorize } from '../../shared/auth/authorize.js';
import { ConsultationController } from './consultation.controller.js';
import { ConsultationRepository } from './consultation.repository.js';
import { ConsultationService } from './consultation.service.js';

export function createConsultationRoutes(db: Pool): Router {
  const router = Router();
  const repository = new ConsultationRepository(db);
  const service = new ConsultationService(repository);
  const controller = new ConsultationController(service);
  const authenticate = createAuthenticateMiddleware(db);

  router.patch(
    '/consultations/:consultationId/status',
    authenticate,
    authorize('patient', 'doctor'),
    controller.updateStatus,
  );

  router.post(
    '/consultations/:consultationId/prescriptions',
    authenticate,
    authorize('doctor'),
    controller.createPrescription,
  );

  router.get(
    '/consultations/:consultationId/prescriptions',
    authenticate,
    authorize('patient', 'doctor'),
    controller.listPrescriptions,
  );

  return router;
}
