import 'dotenv/config';
import type { Pool } from 'pg';
import { Pool as PgPool } from 'pg';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL ?? 'http://localhost:3000/api';
const password = 'Phase5-Smoke-Password-2026!';

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const json = await response.json();
  return { status: response.status, json };
}

async function main() {
  const patientA = await registerAndLogin(`phase5-a-${Date.now()}@example.test`);
  const patientB = await registerAndLogin(`phase5-b-${Date.now()}@example.test`);

  const doctorEmail = `phase5-doctor-${Date.now()}@example.test`;
  const doctorRegistration = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: doctorEmail, password, displayName: 'Phase 5 Smoke Doctor' }),
  });
  if (doctorRegistration.status !== 201) throw new Error(`Doctor registration failed: ${JSON.stringify(doctorRegistration.json)}`);

  const db = createDb();
  try {
    const doctorId = await promoteToDoctorAndGetId(db, doctorRegistration.json.user.id);
    const doctorLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: doctorEmail, password }),
    });
    if (doctorLogin.status !== 200 || !doctorLogin.json.accessToken) throw new Error(`Doctor login failed: ${JSON.stringify(doctorLogin.json)}`);

    const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    startsAt.setSeconds(0, 0);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    const slotResponse = await request('/doctors/availability', {
      method: 'POST',
      headers: { authorization: `Bearer ${doctorLogin.json.accessToken}` },
      body: JSON.stringify({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }),
    });
    if (slotResponse.status !== 201) throw new Error(`Slot creation failed: ${JSON.stringify(slotResponse.json)}`);
    if (slotResponse.json.doctorId !== doctorId) throw new Error('Created slot belongs to the wrong doctor');

    const idempotencyKey = `phase5-idempotency-${Date.now()}`;
    const booking = await request('/consultations', {
      method: 'POST',
      headers: { authorization: `Bearer ${patientA.token}`, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ availabilitySlotId: slotResponse.json.id }),
    });
    if (booking.status !== 201) throw new Error(`Booking failed: ${JSON.stringify(booking.json)}`);

    const replay = await request('/consultations', {
      method: 'POST',
      headers: { authorization: `Bearer ${patientA.token}`, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ availabilitySlotId: slotResponse.json.id }),
    });
    if (replay.status !== 200 || replay.json.id !== booking.json.id) {
      throw new Error(`Idempotency replay failed: ${JSON.stringify(replay.json)}`);
    }

    const secondPatient = await request('/consultations', {
      method: 'POST',
      headers: { authorization: `Bearer ${patientB.token}`, 'Idempotency-Key': `phase5-second-${Date.now()}` },
      body: JSON.stringify({ availabilitySlotId: slotResponse.json.id }),
    });
    if (secondPatient.status !== 409) throw new Error(`Double-booking protection failed: ${JSON.stringify(secondPatient.json)}`);

    const retrievedByPatient = await request(`/consultations/${booking.json.id}`, {
      headers: { authorization: `Bearer ${patientA.token}` },
    });
    if (retrievedByPatient.status !== 200 || retrievedByPatient.json.id !== booking.json.id) {
      throw new Error(`Patient retrieval failed: ${JSON.stringify(retrievedByPatient.json)}`);
    }

    const retrievedByDoctor = await request(`/consultations/${booking.json.id}`, {
      headers: { authorization: `Bearer ${doctorLogin.json.accessToken}` },
    });
    if (retrievedByDoctor.status !== 200 || retrievedByDoctor.json.id !== booking.json.id) {
      throw new Error(`Doctor retrieval failed: ${JSON.stringify(retrievedByDoctor.json)}`);
    }

    const concurrentStartsAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    concurrentStartsAt.setSeconds(0, 0);
    const concurrentEndsAt = new Date(concurrentStartsAt.getTime() + 30 * 60 * 1000);
    const concurrentSlot = await request('/doctors/availability', {
      method: 'POST',
      headers: { authorization: `Bearer ${doctorLogin.json.accessToken}` },
      body: JSON.stringify({ startsAt: concurrentStartsAt.toISOString(), endsAt: concurrentEndsAt.toISOString() }),
    });
    if (concurrentSlot.status !== 201) throw new Error(`Concurrent test slot creation failed: ${JSON.stringify(concurrentSlot.json)}`);

    const concurrentResults = await Promise.all([
      request('/consultations', {
        method: 'POST',
        headers: { authorization: `Bearer ${patientA.token}`, 'Idempotency-Key': `phase5-concurrent-a-${Date.now()}` },
        body: JSON.stringify({ availabilitySlotId: concurrentSlot.json.id }),
      }),
      request('/consultations', {
        method: 'POST',
        headers: { authorization: `Bearer ${patientB.token}`, 'Idempotency-Key': `phase5-concurrent-b-${Date.now()}` },
        body: JSON.stringify({ availabilitySlotId: concurrentSlot.json.id }),
      }),
    ]);
    const concurrentStatuses = concurrentResults.map((result) => result.status).sort((a, b) => a - b);
    if (concurrentStatuses[0] !== 201 || concurrentStatuses[1] !== 409) {
      throw new Error(`Concurrent booking protection failed: ${JSON.stringify(concurrentResults)}`);
    }

    const missingKey = await request('/consultations', {
      method: 'POST',
      headers: { authorization: `Bearer ${patientB.token}` },
      body: JSON.stringify({ availabilitySlotId: slotResponse.json.id }),
    });
    if (missingKey.status !== 400) throw new Error(`Idempotency validation failed: ${JSON.stringify(missingKey.json)}`);

    console.log('Phase 5 booking smoke test passed.');
    console.log(`Doctor: ${doctorId}`);
    console.log(`Consultation: ${booking.json.id}`);
    console.log('Create, idempotent retry, double-booking protection, authorization, retrieval, and validation succeeded.');
  } finally {
    await db.end();
  }
}

async function registerAndLogin(email: string) {
  const registration = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName: 'Phase 5 Smoke Patient' }),
  });
  if (registration.status !== 201) throw new Error(`Patient registration failed: ${JSON.stringify(registration.json)}`);

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (login.status !== 200 || !login.json.accessToken) throw new Error(`Patient login failed: ${JSON.stringify(login.json)}`);
  return { id: registration.json.user.id as string, token: login.json.accessToken as string };
}

function createDb(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  return new PgPool({ connectionString: databaseUrl });
}

async function promoteToDoctorAndGetId(db: Pool, userId: string): Promise<string> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("UPDATE users SET role = 'doctor', updated_at = NOW() WHERE id = $1", [userId]);
    const result = await client.query<{ id: string }>(
      'INSERT INTO doctors (user_id) VALUES ($1) RETURNING id',
      [userId],
    );
    await client.query('COMMIT');
    return result.rows[0].id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main();
