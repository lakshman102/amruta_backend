import type { Pool, PoolClient } from 'pg';

export type Payment = {
  id: string;
  consultationId: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentResult = {
  payment: Payment;
  idempotentReplay: boolean;
};

export class PaymentRepository {
  constructor(private readonly db: Pool) {}

  async createPayment(
    patientUserId: string,
    consultationId: string,
    amount: string,
    currency: string,
    idempotencyKey: string,
  ): Promise<PaymentResult> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const existingByKey = await this.findByIdempotencyKey(client, idempotencyKey);
      if (existingByKey) {
        const ownsConsultation = await this.userOwnsConsultation(
          client,
          patientUserId,
          existingByKey.consultationId,
        );
        if (!ownsConsultation || existingByKey.consultationId !== consultationId) {
          throw new PaymentRepositoryError('IDEMPOTENCY_CONFLICT');
        }

        await client.query('COMMIT');
        return { payment: existingByKey, idempotentReplay: true };
      }

      const consultationResult = await client.query<{
        patientUserId: string;
      }>(
        `SELECT patient_user_id AS "patientUserId"
         FROM consultations
         WHERE id = $1
         FOR UPDATE`,
        [consultationId],
      );
      const consultation = consultationResult.rows[0];

      if (!consultation) {
        throw new PaymentRepositoryError('CONSULTATION_NOT_FOUND');
      }

      if (consultation.patientUserId !== patientUserId) {
        throw new PaymentRepositoryError('FORBIDDEN');
      }

      // Re-check after acquiring the consultation lock so concurrent requests
      // using the same idempotency key replay the committed payment.
      const existingAfterLock = await this.findByIdempotencyKey(client, idempotencyKey);
      if (existingAfterLock) {
        if (existingAfterLock.consultationId !== consultationId) {
          throw new PaymentRepositoryError('IDEMPOTENCY_CONFLICT');
        }

        await client.query('COMMIT');
        return { payment: existingAfterLock, idempotentReplay: true };
      }

      const existingPayment = await this.findByConsultationId(client, consultationId);
      if (existingPayment) {
        throw new PaymentRepositoryError('PAYMENT_EXISTS');
      }

      const result = await client.query<Payment>(
        `INSERT INTO payments
           (consultation_id, amount, currency, status, idempotency_key)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING id, consultation_id AS "consultationId", amount::text AS amount,
                   currency, status, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [consultationId, amount, currency, idempotencyKey],
      );

      const payment = result.rows[0];

      await client.query(
        `INSERT INTO audit_logs
           (actor_user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, 'payment.created', 'payment', $2, $3::jsonb)`,
        [
          patientUserId,
          payment.id,
          JSON.stringify({ consultationId, status: payment.status }),
        ],
      );

      await client.query('COMMIT');
      return { payment, idempotentReplay: false };
    } catch (error) {
      await client.query('ROLLBACK');

      if (isUniqueViolation(error)) {
        const existing = await this.findByIdempotencyKey(this.db, idempotencyKey);
        if (existing) {
          const ownsConsultation = await this.userOwnsConsultation(
            this.db,
            patientUserId,
            existing.consultationId,
          );
          if (ownsConsultation && existing.consultationId === consultationId) {
            return { payment: existing, idempotentReplay: true };
          }
          throw new PaymentRepositoryError('IDEMPOTENCY_CONFLICT');
        }

        const existingPayment = await this.findByConsultationId(this.db, consultationId);
        if (existingPayment) throw new PaymentRepositoryError('PAYMENT_EXISTS');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async findForUser(
    paymentId: string,
    userId: string,
    role: string,
  ): Promise<Payment | null> {
    const result = await this.db.query<Payment>(
      `SELECT p.id, p.consultation_id AS "consultationId", p.amount::text AS amount,
              p.currency, p.status, p.created_at AS "createdAt", p.updated_at AS "updatedAt"
       FROM payments p
       JOIN consultations c ON c.id = p.consultation_id
       LEFT JOIN doctors d ON d.id = c.doctor_id
       WHERE p.id = $1
         AND (c.patient_user_id = $2 OR (d.user_id = $2 AND $3 = 'doctor'))`,
      [paymentId, userId, role],
    );
    return result.rows[0] ?? null;
  }

  async findForConsultation(
    consultationId: string,
    userId: string,
    role: string,
  ): Promise<Payment | null> {
    const result = await this.db.query<Payment>(
      `SELECT p.id, p.consultation_id AS "consultationId", p.amount::text AS amount,
              p.currency, p.status, p.created_at AS "createdAt", p.updated_at AS "updatedAt"
       FROM payments p
       JOIN consultations c ON c.id = p.consultation_id
       LEFT JOIN doctors d ON d.id = c.doctor_id
       WHERE p.consultation_id = $1
         AND (c.patient_user_id = $2 OR (d.user_id = $2 AND $3 = 'doctor'))`,
      [consultationId, userId, role],
    );
    return result.rows[0] ?? null;
  }

  private async findByIdempotencyKey(
    client: Pool | PoolClient,
    idempotencyKey: string,
  ): Promise<Payment | null> {
    const result = await client.query<Payment>(
      `SELECT id, consultation_id AS "consultationId", amount::text AS amount,
              currency, status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM payments
       WHERE idempotency_key = $1`,
      [idempotencyKey],
    );
    return result.rows[0] ?? null;
  }

  private async findByConsultationId(
    client: Pool | PoolClient,
    consultationId: string,
  ): Promise<Payment | null> {
    const result = await client.query<Payment>(
      `SELECT id, consultation_id AS "consultationId", amount::text AS amount,
              currency, status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM payments
       WHERE consultation_id = $1`,
      [consultationId],
    );
    return result.rows[0] ?? null;
  }

  private async userOwnsConsultation(
    client: Pool | PoolClient,
    userId: string,
    consultationId: string,
  ): Promise<boolean> {
    const result = await client.query(
      `SELECT 1
       FROM consultations
       WHERE id = $1 AND patient_user_id = $2`,
      [consultationId, userId],
    );
    return result.rowCount === 1;
  }
}

export class PaymentRepositoryError extends Error {
  constructor(
    public readonly reason:
      | 'CONSULTATION_NOT_FOUND'
      | 'FORBIDDEN'
      | 'PAYMENT_EXISTS'
      | 'IDEMPOTENCY_CONFLICT',
  ) {
    super(reason);
    this.name = 'PaymentRepositoryError';
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error &&
    (error as { code?: string }).code === '23505';
}
