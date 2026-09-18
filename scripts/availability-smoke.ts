import 'dotenv/config';
import type { Pool } from 'pg';
import { Pool as PgPool } from 'pg';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL ?? 'http://localhost:3000/api';
const email = `phase4-smoke-${Date.now()}@example.test`;
const password = 'Phase4-Smoke-Password-2026!';

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const json = await response.json();
  return { status: response.status, json };
}

async function main() {
  const registration = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName: 'Phase 4 Smoke Doctor' }),
  });
  if (registration.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(registration.json)}`);

  const userId = registration.json.user.id as string;
  const db = createDb();
  try {
    await promoteToDoctor(db, userId);

    const login = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (login.status !== 200 || !login.json.accessToken) throw new Error(`Login failed: ${JSON.stringify(login.json)}`);
    const token = login.json.accessToken as string;

    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    startsAt.setSeconds(0, 0);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    const created = await request('/doctors/availability', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }),
    });
    if (created.status !== 201) throw new Error(`Create availability failed: ${JSON.stringify(created.json)}`);

    const doctorId = created.json.doctorId as string;
    const listed = await request(`/doctors/${doctorId}/availability?status=available`);
    if (listed.status !== 200 || !Array.isArray(listed.json.slots) || listed.json.slots.length !== 1) {
      throw new Error(`List availability failed: ${JSON.stringify(listed.json)}`);
    }

    const duplicate = await request('/doctors/availability', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }),
    });
    if (duplicate.status !== 409) throw new Error(`Duplicate protection failed: ${JSON.stringify(duplicate.json)}`);

    const invalid = await request('/doctors/availability', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ startsAt: endsAt.toISOString(), endsAt: startsAt.toISOString() }),
    });
    if (invalid.status !== 400) throw new Error(`Validation failed: ${JSON.stringify(invalid.json)}`);

    const updated = await request(`/doctors/availability/${created.json.id}/status`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'unavailable' }),
    });
    if (updated.status !== 200 || updated.json.status !== 'unavailable') {
      throw new Error(`Status update failed: ${JSON.stringify(updated.json)}`);
    }

    console.log('Phase 4 availability smoke test passed.');
    console.log(`Doctor: ${doctorId}`);
    console.log('Create, retrieval, duplicate protection, validation, and status update succeeded.');
  } finally {
    await db.end();
  }
}

function createDb(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  return new PgPool({ connectionString: databaseUrl });
}

async function promoteToDoctor(db: Pool, userId: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("UPDATE users SET role = 'doctor', updated_at = NOW() WHERE id = $1", [userId]);
    await client.query('INSERT INTO doctors (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main();
