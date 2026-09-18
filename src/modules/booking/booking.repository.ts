import type { Pool, PoolClient } from 'pg';

export type Consultation = {
  id: string;
  patientUserId: string;
  doctorId: string;
  availabilitySlotId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type BookingResult = {
  consultation: Consultation;
  idempotentReplay: boolean;
};

export class BookingRepository {
  constructor(private readonly db: Pool) {}

  async createBooking(patientUserId: string, availabilitySlotId: string, idempotencyKey: string): Promise<BookingResult> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const existingByKey = await this.findByPatientAndIdempotencyKey(client, patientUserId, idempotencyKey);
      if (existingByKey) {
        await client.query('COMMIT');
        return { consultation: existingByKey, idempotentReplay: true };
      }

      const slotResult = await client.query<{
        id: string;
        doctorId: string;
        status: string;
      }>(
        `SELECT id, doctor_id AS "doctorId", status
         FROM availability_slots
         WHERE id = $1
         FOR UPDATE`,
        [availabilitySlotId],
      );
      const slot = slotResult.rows[0];
      if (!slot) throw new RepositoryError('SLOT_NOT_FOUND');

      // Re-check after acquiring the slot lock. A concurrent retry with the same
      // patient + idempotency key may have committed while this transaction waited.
      const existingAfterLock = await this.findByPatientAndIdempotencyKey(client, patientUserId, idempotencyKey);
      if (existingAfterLock) {
        await client.query('COMMIT');
        return { consultation: existingAfterLock, idempotentReplay: true };
      }

      const existingForSlot = await client.query<Consultation>(
        `SELECT id, patient_user_id AS "patientUserId", doctor_id AS "doctorId",
                availability_slot_id AS "availabilitySlotId", status,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM consultations
         WHERE availability_slot_id = $1
         LIMIT 1`,
        [availabilitySlotId],
      );

      if (existingForSlot.rows[0]) {
        throw new RepositoryError('SLOT_BOOKED');
      }

      if (slot.status !== 'available') {
        throw new RepositoryError('SLOT_UNAVAILABLE');
      }

      const consultationResult = await client.query<Consultation>(
        `INSERT INTO consultations
           (patient_user_id, doctor_id, availability_slot_id, status, idempotency_key)
         VALUES ($1, $2, $3, 'scheduled', $4)
         RETURNING id, patient_user_id AS "patientUserId", doctor_id AS "doctorId",
                   availability_slot_id AS "availabilitySlotId", status,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [patientUserId, slot.doctorId, availabilitySlotId, idempotencyKey],
      );

      await client.query(
        `UPDATE availability_slots
         SET status = 'unavailable', updated_at = NOW()
         WHERE id = $1`,
        [availabilitySlotId],
      );

      await client.query('COMMIT');
      return { consultation: consultationResult.rows[0], idempotentReplay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      if (isUniqueViolation(error)) {
        const existing = await this.findByPatientAndIdempotencyKey(this.db, patientUserId, idempotencyKey);
        if (existing) return { consultation: existing, idempotentReplay: true };
        throw new RepositoryError('SLOT_BOOKED');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async findForUser(consultationId: string, userId: string, role: string): Promise<Consultation | null> {
    const result = await this.db.query<Consultation>(
      `SELECT c.id, c.patient_user_id AS "patientUserId", c.doctor_id AS "doctorId",
              c.availability_slot_id AS "availabilitySlotId", c.status,
              c.created_at AS "createdAt", c.updated_at AS "updatedAt"
       FROM consultations c
       LEFT JOIN doctors d ON d.id = c.doctor_id
       WHERE c.id = $1
         AND (c.patient_user_id = $2 OR (d.user_id = $2 AND $3 = 'doctor'))`,
      [consultationId, userId, role],
    );
    return result.rows[0] ?? null;
  }

  private async findByPatientAndIdempotencyKey(
    client: PoolClient | Pool,
    patientUserId: string,
    idempotencyKey: string,
  ): Promise<Consultation | null> {
    const result = await client.query<Consultation>(
      `SELECT id, patient_user_id AS "patientUserId", doctor_id AS "doctorId",
              availability_slot_id AS "availabilitySlotId", status,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM consultations
       WHERE patient_user_id = $1 AND idempotency_key = $2`,
      [patientUserId, idempotencyKey],
    );
    return result.rows[0] ?? null;
  }
}

export class RepositoryError extends Error {
  constructor(public readonly reason: 'SLOT_NOT_FOUND' | 'SLOT_BOOKED' | 'SLOT_UNAVAILABLE') {
    super(reason);
    this.name = 'RepositoryError';
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}
