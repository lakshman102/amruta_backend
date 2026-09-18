import { HttpError } from '../../shared/errors/http-error.js';
import {
  ConsultationRepository,
  ConsultationRepositoryError,
} from './consultation.repository.js';
import type {
  ConsultationStatus,
  CreatePrescriptionInput,
} from './consultation.schemas.js';

export class ConsultationService {
  constructor(private readonly repository: ConsultationRepository) {}

  async updateStatus(
    consultationId: string,
    userId: string,
    role: string,
    status: ConsultationStatus,
  ) {
    try {
      return await this.repository.updateStatus(
        consultationId,
        userId,
        role,
        status,
      );
    } catch (error) {
      if (error instanceof ConsultationRepositoryError) {
        if (error.reason === 'NOT_FOUND') {
          throw new HttpError(404, 'Consultation not found');
        }
        if (error.reason === 'INVALID_TRANSITION') {
          throw new HttpError(409, 'Invalid consultation status transition');
        }
      }
      throw error;
    }
  }

  async get(consultationId: string, userId: string, role: string) {
    const consultation = await this.repository.findForUser(
      consultationId,
      userId,
      role,
    );

    if (!consultation) throw new HttpError(404, 'Consultation not found');
    return consultation;
  }

  async createPrescription(
    consultationId: string,
    doctorUserId: string,
    input: CreatePrescriptionInput,
  ) {
    try {
      return await this.repository.createPrescription(
        consultationId,
        doctorUserId,
        input.content,
      );
    } catch (error) {
      if (error instanceof ConsultationRepositoryError) {
        if (error.reason === 'NOT_FOUND') {
          throw new HttpError(404, 'Consultation not found');
        }
        if (error.reason === 'PRESCRIPTION_REQUIRES_COMPLETED') {
          throw new HttpError(409, 'Prescription requires a completed consultation');
        }
      }
      throw error;
    }
  }

  async listPrescriptions(
    consultationId: string,
    userId: string,
    role: string,
  ) {
    try {
      return await this.repository.listPrescriptions(
        consultationId,
        userId,
        role,
      );
    } catch (error) {
      if (
        error instanceof ConsultationRepositoryError &&
        error.reason === 'NOT_FOUND'
      ) {
        throw new HttpError(404, 'Consultation not found');
      }
      throw error;
    }
  }
}
