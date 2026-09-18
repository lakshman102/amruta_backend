import { HttpError } from '../../shared/errors/http-error.js';
import { PaymentRepository, PaymentRepositoryError } from './payment.repository.js';
import type { CreatePaymentInput } from './payment.schemas.js';

export class PaymentService {
  constructor(private readonly repository: PaymentRepository) {}

  async create(
    patientUserId: string,
    consultationId: string,
    input: CreatePaymentInput,
  ) {
    try {
      return await this.repository.createPayment(
        patientUserId,
        consultationId,
        input.amount,
        input.currency,
        input.idempotencyKey,
      );
    } catch (error) {
      if (error instanceof PaymentRepositoryError) {
        if (error.reason === 'CONSULTATION_NOT_FOUND') {
          throw new HttpError(404, 'Consultation not found');
        }
        if (error.reason === 'FORBIDDEN') {
          throw new HttpError(403, 'Forbidden');
        }
        if (error.reason === 'PAYMENT_EXISTS') {
          throw new HttpError(409, 'Payment already exists for consultation');
        }
        if (error.reason === 'IDEMPOTENCY_CONFLICT') {
          throw new HttpError(409, 'Idempotency-Key conflicts with an existing payment');
        }
      }
      throw error;
    }
  }

  async getByPaymentId(paymentId: string, userId: string, role: string) {
    const payment = await this.repository.findForUser(paymentId, userId, role);
    if (!payment) throw new HttpError(404, 'Payment not found');
    return payment;
  }

  async getByConsultationId(consultationId: string, userId: string, role: string) {
    const payment = await this.repository.findForConsultation(consultationId, userId, role);
    if (!payment) throw new HttpError(404, 'Payment not found');
    return payment;
  }
}
