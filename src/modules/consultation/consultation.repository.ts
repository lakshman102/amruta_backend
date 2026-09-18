import type { Pool, PoolClient } from 'pg';
import type { ConsultationStatus } from './consultation.schemas.js';

export type Consultation = {
  id: string;
  patientUserId: string;
  doctorId: string;
  availabilitySlotId: string;
  status: ConsultationStatus;
  createdAt: string;
  updatedAt: string;
};

export type Prescription = {
  id: string;
  consultationId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export class ConsultationRepository {
  constructor(private readonly db: Pool) {}

  async updateStatus(
    consultationId: string,
    userId: string,
    role: string,
    nextStatus: ConsultationStatus,
  ): Promise<Consultation> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const consultation = await this.findAuthorizedForUpdate(
        client,
        consultationId,
        userId,
        role,
      );

      if (!consultation) {
        throw new ConsultationRepositoryError('NOT_FOUND');
      }

      if (!isValidTransition(consultation.status, nextStatus, role)) {
        throw new ConsultationRepositoryError('INVALID_TRANSITION');
      }

      const result = await client.query<Consultation>(
        `UPDATE consultations
         SET status = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING id, patient_user_id AS "patientUserId", doctor_id AS "doctorId",
                   availability_slot_id AS "availabilitySlotId", status,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [consultationId, nextStatus],
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findForUser(
    consultationId: string,
    userId: string,
    role: string,
  ): Promise<Consultation | null> {
    return this.findAuthorized(this.db, consultationId, userId, role);
  }

  async createPrescription(
    consultationId: string,
    doctorUserId: string,
    content: string,
  ): Promise<Prescription> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const consultation = await this.findAuthorizedForUpdate(
        client,
        consultationId,
        doctorUserId,
        'doctor',
      );

      if (!consultation) {
        throw new ConsultationRepositoryError('NOT_FOUND');
      }

      if (consultation.status !== 'completed') {
        throw new ConsultationRepositoryError('PRESCRIPTION_REQUIRES_COMPLETED');
      }

      const result = await client.query<Prescription>(
        `INSERT INTO prescriptions (consultation_id, content)
         VALUES ($1, $2)
         RETURNING id, consultation_id AS "consultationId", content,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [consultationId, content],
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listPrescriptions(
    consultationId: string,
    userId: string,
    role: string,
  ): Promise<Prescription[]> {
    const consultation = await this.findAuthorized(
      this.db,
      consultationId,
      userId,
      role,
    );

    if (!consultation) {
      throw new ConsultationRepositoryError('NOT_FOUND');
    }

    const result = await this.db.query<Prescription>(
      `SELECT id, consultation_id AS "consultationId", content,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM prescriptions
       WHERE consultation_id = $1
       ORDER BY created_at ASC, id ASC`,
      [consultationId],
    );

    return result.rows;
  }

  private async findAuthorizedForUpdate(
    client: PoolClient,
    consultationId: string,
    userId: string,
    role: string,
  ): Promise<Consultation | null> {
    return this.findAuthorized(client, consultationId, userId, role, true);
  }

  private async findAuthorized(
    client: PoolClient | Pool,
    consultationId: string,
    userId: string,
    role: string,
    forUpdate = false,
  ): Promise<Consultation | null> {
    const lockClause = forUpdate ? ' FOR UPDATE' : '';
    const result = await client.query<Consultation>(
      `SELECT c.id, c.patient_user_id AS "patientUserId", c.doctor_id AS "doctorId",
              c.availability_slot_id AS "availabilitySlotId", c.status,
              c.created_at AS "createdAt", c.updated_at AS "updatedAt"
       FROM consultations c
       JOIN doctors d ON d.id = c.doctor_id
       WHERE c.id = $1
         AND (c.patient_user_id = $2 OR (d.user_id = $2 AND $3 = 'doctor'))${lockClause}`,
      [consultationId, userId, role],
    );

    return result.rows[0] ?? null;
  }
}

export class ConsultationRepositoryError extends Error {
  constructor(
    public readonly reason:
      | 'NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'PRESCRIPTION_REQUIRES_COMPLETED',
  ) {
    super(reason);
    this.name = 'ConsultationRepositoryError';
  }
}

function isValidTransition(
  current: ConsultationStatus,
  next: ConsultationStatus,
  role: string,
): boolean {
  if (current === next) return false;

  if (role === 'patient') {
    return current === 'scheduled' && next === 'cancelled';
  }

  if (role !== 'doctor') return false;

  if (current === 'scheduled') {
    return next === 'in_progress' || next === 'cancelled';
  }

  if (current === 'in_progress') {
    return next === 'completed' || next === 'cancelled';
  }

  return false;
}
