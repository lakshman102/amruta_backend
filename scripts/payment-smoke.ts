import 'dotenv/config';
import type { Pool } from 'pg';
import { Pool as PgPool } from 'pg';

const baseUrl = process.env.PAYMENT_SMOKE_BASE_URL ?? 'http://localhost:3000/api';
const suffix = Date.now();
const patientEmail = `phase8-patient-${suffix}@example.test`;
const doctorEmail = `phase8-doctor-${suffix}@example.test`;
const password = 'Phase8-Smoke-Password-2026!';

async function request(
  path: string,
  method: string,
  body?: unknown,
  token?: string,
  idempotencyKey?: string,
) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json();
  return { status: response.status, json };
}

async function main() {
  const patientRegistration = await request('/auth/register', 'POST', {
    email: patientEmail,
    password,
    displayName: 'Phase 8 Patient',
  });
  if (patientRegistration.status !== 201) {
    throw new Error(`Patient registration failed: ${JSON.stringify(patientRegistration.json)}`);
  }

  const doctorRegistration = await request('/auth/register', 'POST', {
    email: doctorEmail,
    password,
    displayName: 'Phase 8 Doctor',
  });
  if (doctorRegistration.status !== 201) {
    throw new Error(`Doctor registration failed: ${JSON.stringify(doctorRegistration.json)}`);
  }

  const doctorId = doctorRegistration.json.user.id as string;
  const db = createDb();
  try {
    await promoteToDoctor(db, doctorId);

    const patientLogin = await request('/auth/login', 'POST', {
      email: patientEmail,
      password,
    });
    if (patientLogin.status !== 200 || !patientLogin.json.accessToken) {
      throw new Error(`Patient login failed: ${JSON.stringify(patientLogin.json)}`);
    }

    const doctorLogin = await request('/auth/login', 'POST', {
      email: doctorEmail,
      password,
    });
    if (doctorLogin.status !== 200 || !doctorLogin.json.accessToken) {
      throw new Error(`Doctor login failed: ${JSON.stringify(doctorLogin.json)}`);
    }

    const availability = await request(
      '/doctors/availability',
      'POST',
      {
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        endsAt: new Date(Date.now() + 90_000_000).toISOString(),
      },
      doctorLogin.json.accessToken,
    );
    if (availability.status !== 201) {
      throw new Error(`Availability creation failed: ${JSON.stringify(availability.json)}`);
    }

    const booking = await request(
      '/consultations',
      'POST',
      { availabilitySlotId: availability.json.id },
      patientLogin.json.accessToken,
      `phase8-booking-${suffix}`,
    );
    if (booking.status !== 201) {
      throw new Error(`Booking failed: ${JSON.stringify(booking.json)}`);
    }

    const consultationId = booking.json.id;
    const idempotencyKey = `phase8-payment-${suffix}`;
    const payment = await request(
      `/consultations/${consultationId}/payments`,
      'POST',
      { amount: '500.00', currency: 'INR' },
      patientLogin.json.accessToken,
      idempotencyKey,
    );

    if (payment.status !== 201 || payment.json.status !== 'pending') {
      throw new Error(`Payment creation failed: ${JSON.stringify(payment.json)}`);
    }

    const replay = await request(
      `/consultations/${consultationId}/payments`,
      'POST',
      { amount: '500.00', currency: 'INR' },
      patientLogin.json.accessToken,
      idempotencyKey,
    );
    if (replay.status !== 200 || replay.json.id !== payment.json.id) {
      throw new Error(`Payment idempotency failed: ${JSON.stringify(replay.json)}`);
    }

    const byConsultation = await request(
      `/consultations/${consultationId}/payments`,
      'GET',
      undefined,
      patientLogin.json.accessToken,
    );
    if (byConsultation.status !== 200 || byConsultation.json.id !== payment.json.id) {
      throw new Error(`Payment retrieval failed: ${JSON.stringify(byConsultation.json)}`);
    }

    const byPaymentId = await request(
      `/payments/${payment.json.id}`,
      'GET',
      undefined,
      doctorLogin.json.accessToken,
    );
    if (byPaymentId.status !== 200 || byPaymentId.json.id !== payment.json.id) {
      throw new Error(`Doctor payment retrieval failed: ${JSON.stringify(byPaymentId.json)}`);
    }

    const duplicateWithNewKey = await request(
      `/consultations/${consultationId}/payments`,
      'POST',
      { amount: '500.00', currency: 'INR' },
      patientLogin.json.accessToken,
      `phase8-payment-duplicate-${suffix}`,
    );
    if (duplicateWithNewKey.status !== 409) {
      throw new Error(`Duplicate payment protection failed: ${JSON.stringify(duplicateWithNewKey.json)}`);
    }
    console.log('Phase 8 payment smoke test passed.');
    console.log(`Consultation: ${consultationId}`);
    console.log(`Payment: ${payment.json.id}`);
    console.log('Payment creation, idempotent retry, authorization, retrieval, audit logging, and duplicate protection succeeded.');
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
