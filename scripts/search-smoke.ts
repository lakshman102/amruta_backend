import 'dotenv/config';
import type { Pool } from 'pg';
import { Pool as PgPool } from 'pg';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL ?? 'http://localhost:3000/api';
const password = 'Phase7-Smoke-Password-2026!';

async function request(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  const json = await response.json();
  return { status: response.status, json };
}

async function main() {
  const db = createDb();
  const suffix = Date.now();
  const doctorA = await createDoctorFixture(db, `phase7-doctor-a-${suffix}@example.test`, 'Phase 7 Search Alpha');
  const doctorB = await createDoctorFixture(db, `phase7-doctor-b-${suffix}@example.test`, 'Phase 7 Search Beta');
  const inactive = await createDoctorFixture(db, `phase7-inactive-${suffix}@example.test`, 'Phase 7 Inactive', 'inactive');

  try {
    const futureStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
    futureStart.setSeconds(0, 0);
    const futureEnd = new Date(futureStart.getTime() + 30 * 60 * 1000);

    await createSlot(db, doctorA.doctorId, futureStart.toISOString(), futureEnd.toISOString(), 'available');
    await createSlot(db, doctorB.doctorId, futureStart.toISOString(), futureEnd.toISOString(), 'unavailable');

    const all = await request('/doctors/search?page=1&pageSize=2');
    if (all.status !== 200 || !Array.isArray(all.json.items) || all.json.items.length !== 2) {
      throw new Error(`Basic search failed: ${JSON.stringify(all.json)}`);
    }
    if (typeof all.json.hasMore !== 'boolean') throw new Error('Pagination metadata missing');

    const filtered = await request(
      `/doctors/search?q=phase%207%20search%20alpha&status=available&availableFrom=${encodeURIComponent(futureStart.toISOString())}&availableTo=${encodeURIComponent(futureEnd.toISOString())}`,
    );
    if (
      filtered.status !== 200 ||
      filtered.json.items.length !== 1 ||
      filtered.json.items[0].doctorId !== doctorA.doctorId
    ) {
      throw new Error(`Filtered search failed: ${JSON.stringify(filtered.json)}`);
    }

    const inactiveSearch = await request(`/doctors/search?q=${encodeURIComponent('Phase 7 Inactive')}`);
    if (inactiveSearch.status !== 200 || inactiveSearch.json.items.some((item: { doctorId: string }) => item.doctorId === inactive.doctorId)) {
      throw new Error(`Inactive doctor was returned: ${JSON.stringify(inactiveSearch.json)}`);
    }

    const invalid = await request('/doctors/search?page=0&pageSize=51');
    if (invalid.status !== 400) throw new Error(`Validation failed: ${JSON.stringify(invalid.json)}`);

    console.log('Phase 7 search smoke test passed.');
    console.log(`Doctors: ${doctorA.doctorId}, ${doctorB.doctorId}`);
    console.log('Search, filtering, pagination, active-user filtering, and validation succeeded.');
  } finally {
    await db.end();
  }
}

function createDb(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  return new PgPool({ connectionString: databaseUrl });
}

async function createDoctorFixture(db: Pool, email: string, displayName: string, status = 'active') {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, 'phase7-smoke-placeholder', 'doctor', $2)
       RETURNING id`,
      [email, status],
    );
    await client.query(
      `INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)`,
      [user.rows[0].id, displayName],
    );
    const doctor = await client.query<{ id: string }>(
      `INSERT INTO doctors (user_id) VALUES ($1) RETURNING id`,
      [user.rows[0].id],
    );
    await client.query('COMMIT');
    return { userId: user.rows[0].id, doctorId: doctor.rows[0].id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createSlot(db: Pool, doctorId: string, startsAt: string, endsAt: string, status: string) {
  await db.query(
    `INSERT INTO availability_slots (doctor_id, starts_at, ends_at, status)
     VALUES ($1, $2, $3, $4)`,
    [doctorId, startsAt, endsAt, status],
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
