import type { Pool } from 'pg';
import type { AnalyticsInput } from './analytics.schemas.js';

export type AnalyticsResult = {
  users: { total: number; active: number };
  doctors: { total: number; active: number };
  availability: Record<string, number>;
  consultations: { total: number; byStatus: Record<string, number> };
  payments: { total: number; byStatus: Record<string, number>; completedAmount: string };
};

export class AnalyticsRepository {
  constructor(private readonly db: Pool) {}

  async getAnalytics(input: AnalyticsInput): Promise<AnalyticsResult> {
    const [users, doctors, availability, consultations, payments] = await Promise.all([
      this.db.query<{ total: string; active: string }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE status = 'active')::text AS active
         FROM users`,
      ),
      this.db.query<{ total: string; active: string }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE u.status = 'active')::text AS active
         FROM doctors d
         JOIN users u ON u.id = d.user_id`,
      ),
      this.db.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count
         FROM availability_slots
         ${this.timeWhere('created_at', input, 1)}
         GROUP BY status
         ORDER BY status`,
        this.timeValues(input),
      ),
      this.db.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count
         FROM consultations
         ${this.timeWhere('created_at', input, 1)}
         GROUP BY status
         ORDER BY status`,
        this.timeValues(input),
      ),
      this.db.query<{ status: string; count: string; completed_amount: string }>(
        `SELECT status,
                COUNT(*)::text AS count,
                COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0)::text AS completed_amount
         FROM payments
         ${this.timeWhere('created_at', input, 1)}
         GROUP BY status
         ORDER BY status`,
        this.timeValues(input),
      ),
    ]);

    const paymentRows = payments.rows;
    const completedAmount = Number(
      paymentRows.find((row) => row.status === 'completed')?.completed_amount ?? 0,
    );

    return {
      users: {
        total: Number(users.rows[0]?.total ?? 0),
        active: Number(users.rows[0]?.active ?? 0),
      },
      doctors: {
        total: Number(doctors.rows[0]?.total ?? 0),
        active: Number(doctors.rows[0]?.active ?? 0),
      },
      availability: Object.fromEntries(
        availability.rows.map((row) => [row.status, Number(row.count)]),
      ),
      consultations: {
        total: consultations.rows.reduce((sum, row) => sum + Number(row.count), 0),
        byStatus: Object.fromEntries(
          consultations.rows.map((row) => [row.status, Number(row.count)]),
        ),
      },
      payments: {
        total: paymentRows.reduce((sum, row) => sum + Number(row.count), 0),
        byStatus: Object.fromEntries(
          paymentRows.map((row) => [row.status, Number(row.count)]),
        ),
        completedAmount: completedAmount.toFixed(2),
      },
    };
  }

  private timeWhere(column: string, input: AnalyticsInput, firstParam: number): string {
    const conditions: string[] = [];
    if (input.from) conditions.push(`${column} >= $${firstParam}`);
    if (input.to) conditions.push(`${column} < $${firstParam + (input.from ? 1 : 0)}`);
    return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  private timeValues(input: AnalyticsInput): string[] {
    return [input.from, input.to].filter((value): value is string => value !== null);
  }
}
