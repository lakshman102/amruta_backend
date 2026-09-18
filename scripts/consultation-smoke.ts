import 'dotenv/config';

import { randomBytes } from 'node:crypto';

const baseUrl = process.env.CONSULTATION_SMOKE_BASE_URL ?? 'http://localhost:3000/api';
const suffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
const doctorEmail = `phase6-doctor-${suffix}@example.test`;
const patientEmail = `phase6-patient-${suffix}@example.test`;
const password = 'Phase6-Smoke-Password-2026!';

async function request(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(options.token === undefined ? {} : { authorization: `Bearer ${options.token}` }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const json = await response.json();
  return { status: response.status, json };
}

async function register(email: string, displayName: string) {
  const response = await request('/auth/register', {
    method: 'POST',
    body: { email, password, displayName },
  });
  if (response.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(response.json)}`);
  }
  return response.json.user.id as string;
}

async function login(email: string) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (response.status !== 200 || !response.json.accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(response.json)}`);
  }
  return response.json.accessToken as string;
}

async function main() {
  const doctorUserId = await register(doctorEmail, 'Phase 6 Doctor');
  const patientUserId = await register(patientEmail, 'Phase 6 Patient');
  const doctorToken = await login(doctorEmail);
  const patientToken = await login(patientEmail);

  // Public registration creates patients only. Promote this smoke-test user
  // through the database so the test can exercise doctor-only behavior without
  // adding a production endpoint outside the assignment scope.
  const { Client } = await import('pg');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('UPDATE users SET role = $1 WHERE id = $2', ['doctor', doctorUserId]);
    await client.query('INSERT INTO doctors (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [doctorUserId]);
  } finally {
    await client.end();
  }

  // Re-login so the JWT contains the doctor role.
  const refreshedDoctorToken = await login(doctorEmail);

  const slotStart = new Date(Date.now() + 60 * 60 * 1000);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

  const slot = await request('/doctors/availability', {
    method: 'POST',
    token: refreshedDoctorToken,
    body: { startsAt: slotStart.toISOString(), endsAt: slotEnd.toISOString() },
  });
  if (slot.status !== 201) throw new Error(`Slot creation failed: ${JSON.stringify(slot.json)}`);

  const bookingResponse = await fetch(`${baseUrl}/consultations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${patientToken}`,
      'Idempotency-Key': `phase6-${suffix}`,
    },
    body: JSON.stringify({ availabilitySlotId: slot.json.id }),
  });
  const bookingJson = await bookingResponse.json();
  if (bookingResponse.status !== 201) {
    throw new Error(`Booking failed: ${JSON.stringify(bookingJson)}`);
  }

  return finishFlow(bookingJson.id, patientToken, refreshedDoctorToken);
}

async function finishFlow(
  consultationId: string,
  patientToken: string,
  doctorToken: string,
) {
  const patientStart = await request(`/consultations/${consultationId}/status`, {
    method: 'PATCH',
    token: patientToken,
    body: { status: 'in_progress' },
  });
  if (patientStart.status !== 409) {
    throw new Error(`Patient invalid transition handling failed: ${JSON.stringify(patientStart.json)}`);
  }

  const start = await request(`/consultations/${consultationId}/status`, {
    method: 'PATCH',
    token: doctorToken,
    body: { status: 'in_progress' },
  });
  if (start.status !== 200 || start.json.status !== 'in_progress') {
    throw new Error(`Start consultation failed: ${JSON.stringify(start.json)}`);
  }

  const complete = await request(`/consultations/${consultationId}/status`, {
    method: 'PATCH',
    token: doctorToken,
    body: { status: 'completed' },
  });
  if (complete.status !== 200 || complete.json.status !== 'completed') {
    throw new Error(`Complete consultation failed: ${JSON.stringify(complete.json)}`);
  }

  const prescription = await request(`/consultations/${consultationId}/prescriptions`, {
    method: 'POST',
    token: doctorToken,
    body: { content: 'Take the prescribed medication as directed.' },
  });
  if (prescription.status !== 201 || !prescription.json.id) {
    throw new Error(`Prescription creation failed: ${JSON.stringify(prescription.json)}`);
  }

  const patientPrescriptions = await request(`/consultations/${consultationId}/prescriptions`, {
    token: patientToken,
  });
  if (
    patientPrescriptions.status !== 200 ||
    !Array.isArray(patientPrescriptions.json.prescriptions) ||
    patientPrescriptions.json.prescriptions.length !== 1
  ) {
    throw new Error(`Prescription retrieval failed: ${JSON.stringify(patientPrescriptions.json)}`);
  }

  const consultation = await request(`/consultations/${consultationId}`, {
    token: patientToken,
  });
  if (consultation.status !== 200 || consultation.json.status !== 'completed') {
    throw new Error(`Consultation retrieval failed: ${JSON.stringify(consultation.json)}`);
  }

  const invalidTransition = await request(`/consultations/${consultationId}/status`, {
    method: 'PATCH',
    token: doctorToken,
    body: { status: 'scheduled' },
  });
  if (invalidTransition.status !== 409) {
    throw new Error(`Invalid transition validation failed: ${JSON.stringify(invalidTransition.json)}`);
  }

  console.log('Phase 6 consultation smoke test passed.');
  console.log(`Consultation: ${consultationId}`);
  console.log('Lifecycle, authorization, prescription creation/retrieval, and validation succeeded.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
