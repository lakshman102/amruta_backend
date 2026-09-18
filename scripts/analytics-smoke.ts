import 'dotenv/config';
import { Pool } from 'pg';

const baseUrl = process.env.ANALYTICS_SMOKE_BASE_URL ?? 'http://localhost:3000/api';
const email = `phase10-smoke-${Date.now()}@example.test`;
const password = 'Phase10-Smoke-Password-2026!';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function post(path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

async function main() {
  try {
    const registration = await post('/auth/register', {
      email,
      password,
      displayName: 'Phase 10 Analytics Smoke',
    });
    if (registration.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(registration.json)}`);

    const userId = registration.json.user.id as string;
    await pool.query(`UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1`, [userId]);

    const login = await post('/auth/login', { email, password });
    if (login.status !== 200 || !login.json.accessToken) throw new Error(`Admin login failed: ${JSON.stringify(login.json)}`);

    const token = login.json.accessToken as string;
    const adminResponse = await fetch(`${baseUrl}/admin/analytics`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (adminResponse.status !== 200) throw new Error(`Admin analytics access failed: ${adminResponse.status}`);
    const analytics = await adminResponse.json();
    if (!analytics.users || !analytics.doctors || !analytics.consultations || !analytics.payments) {
      throw new Error(`Analytics response is incomplete: ${JSON.stringify(analytics)}`);
    }

    const rangeResponse = await fetch(`${baseUrl}/admin/analytics?from=not-a-date`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (rangeResponse.status !== 400) throw new Error(`Invalid date should return 400: ${rangeResponse.status}`);

    const nonAdmin = await post('/auth/register', {
      email: `phase10-nonadmin-${Date.now()}@example.test`,
      password,
      displayName: 'Phase 10 Non Admin',
    });
    if (nonAdmin.status !== 201) throw new Error(`Non-admin registration failed: ${JSON.stringify(nonAdmin.json)}`);
    const nonAdminLogin = await post('/auth/login', { email: nonAdmin.json.user.email, password });
    const forbidden = await fetch(`${baseUrl}/admin/analytics`, {
      headers: { authorization: `Bearer ${nonAdminLogin.json.accessToken}` },
    });
    if (forbidden.status !== 403) throw new Error(`Non-admin analytics access should be forbidden: ${forbidden.status}`);

    console.log('Phase 10 analytics smoke test passed.');
    console.log('Admin authorization, aggregate metrics, date validation, and non-admin protection succeeded.');
  } finally {
    await pool.end();
  }
}

main();
