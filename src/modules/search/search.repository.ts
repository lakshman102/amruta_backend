import type { Pool } from 'pg';
import type { SearchDoctorsInput } from './search.schemas.js';

export type DoctorSearchResult = {
  doctorId: string;
  userId: string;
  email: string;
  displayName: string | null;
};

export type DoctorSearchPage = {
  items: DoctorSearchResult[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export class SearchRepository {
  constructor(private readonly db: Pool) {}

  async searchDoctors(input: SearchDoctorsInput): Promise<DoctorSearchPage> {
    const limit = input.pageSize + 1;
    const offset = (input.page - 1) * input.pageSize;
    const conditions: string[] = ["u.role = 'doctor'", "u.status = 'active'"];
    const params: Array<string | number | null> = [];

    if (input.query) {
      params.push(`${input.query}%`);
      conditions.push(`(
        LOWER(p.display_name) LIKE $${params.length}
        OR LOWER(u.email) LIKE $${params.length}
      )`);
    }

    const hasAvailabilityFilter =
      input.availabilityStatus !== null || input.availableFrom !== null || input.availableTo !== null;

    if (hasAvailabilityFilter) {
      const availabilityConditions: string[] = ['s.doctor_id = d.id'];

      if (input.availabilityStatus) {
        params.push(input.availabilityStatus);
        availabilityConditions.push(`s.status = $${params.length}`);
      }

      if (input.availableFrom) {
        params.push(input.availableFrom);
        availabilityConditions.push(`s.starts_at >= $${params.length}`);
      }

      if (input.availableTo) {
        params.push(input.availableTo);
        availabilityConditions.push(`s.ends_at <= $${params.length}`);
      }

      conditions.push(`EXISTS (
        SELECT 1
        FROM availability_slots s
        WHERE ${availabilityConditions.join(' AND ')}
      )`);
    }

    params.push(limit, offset);
    const limitParam = params.length - 1;
    const offsetParam = params.length;

    const result = await this.db.query<DoctorSearchResult>(
      `SELECT d.id AS "doctorId",
              u.id AS "userId",
              u.email,
              p.display_name AS "displayName"
       FROM doctors d
       INNER JOIN users u ON u.id = d.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY LOWER(COALESCE(p.display_name, '')) ASC, d.id ASC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params,
    );

    const hasMore = result.rows.length > input.pageSize;
    return {
      items: hasMore ? result.rows.slice(0, input.pageSize) : result.rows,
      page: input.page,
      pageSize: input.pageSize,
      hasMore,
    };
  }
}
