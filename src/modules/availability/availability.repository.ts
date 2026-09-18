import type { Pool } from 'pg';

export type AvailabilitySlot = {
  id: string;
  doctorId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export class AvailabilityRepository {
  constructor(private readonly db: Pool) {}

  async findDoctorByUserId(userId: string): Promise<string | null> {
    const result = await this.db.query<{ id: string }>(
      'SELECT id FROM doctors WHERE user_id = $1',
      [userId],
    );
    return result.rows[0]?.id ?? null;
  }

  async createSlot(doctorId: string, startsAt: string, endsAt: string): Promise<AvailabilitySlot> {
    const result = await this.db.query<AvailabilitySlot>(
      `INSERT INTO availability_slots (doctor_id, starts_at, ends_at, status)
       VALUES ($1, $2, $3, 'available')
       RETURNING id, doctor_id AS "doctorId", starts_at AS "startsAt", ends_at AS "endsAt",
                 status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [doctorId, startsAt, endsAt],
    );
    return result.rows[0];
  }

  async listByDoctorId(doctorId: string, status: 'available' | 'unavailable' | null): Promise<AvailabilitySlot[]> {
    const result = await this.db.query<AvailabilitySlot>(
      `SELECT id, doctor_id AS "doctorId", starts_at AS "startsAt", ends_at AS "endsAt",
              status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM availability_slots
       WHERE doctor_id = $1
         AND ($2::text IS NULL OR status = $2)
       ORDER BY starts_at ASC`,
      [doctorId, status],
    );
    return result.rows;
  }

  async findById(slotId: string): Promise<AvailabilitySlot | null> {
    const result = await this.db.query<AvailabilitySlot>(
      `SELECT id, doctor_id AS "doctorId", starts_at AS "startsAt", ends_at AS "endsAt",
              status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM availability_slots
       WHERE id = $1`,
      [slotId],
    );
    return result.rows[0] ?? null;
  }

  async updateStatus(slotId: string, status: 'available' | 'unavailable'): Promise<AvailabilitySlot | null> {
    const result = await this.db.query<AvailabilitySlot>(
      `UPDATE availability_slots
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, doctor_id AS "doctorId", starts_at AS "startsAt", ends_at AS "endsAt",
                 status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [status, slotId],
    );
    return result.rows[0] ?? null;
  }
}
