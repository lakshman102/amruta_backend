import 'dotenv/config';
import { Pool } from 'pg';

const baseUrl = process.env.AUDIT_SMOKE_BASE_URL ?? 'http://localhost:3000/api';
const email = `phase9-audit-${Date.now()}@example.test`;
const password = 'Phase9-Audit-Password-2026!';

async function post(path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

async function main() {
  const registration = await post('/auth/register', { email, password, displayName: 'Phase 9 Audit Test' });
  if (registration.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(registration.json)}`);

  const login = await post('/auth/login', { email, password });
  if (login.status !== 200 || !login.json.accessToken) throw new Error(`Login failed: ${JSON.stringify(login.json)}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const auditRows = await pool.query(
    `SELECT action FROM audit_logs WHERE actor_user_id = $1 AND action IN ('auth.registered', 'auth.login_succeeded') ORDER BY created_at ASC`,
    [registration.json.user.id],
  );
  if (auditRows.rowCount !== 2) throw new Error(`Expected authentication audit events: ${auditRows.rowCount}`);

  const nonAdminResponse = await fetch(`${baseUrl}/admin/audit-logs?page=1&pageSize=20`, {
    headers: { authorization: `Bearer ${login.json.accessToken}` },
  });
  if (nonAdminResponse.status !== 403) throw new Error(`Non-admin audit access should be forbidden: ${nonAdminResponse.status}`);

  await pool.query(`UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1`, [registration.json.user.id]);
  const adminLogin = await post('/auth/login', { email, password });
  if (adminLogin.status !== 200 || !adminLogin.json.accessToken) throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.json)}`);

  const adminResponse = await fetch(`${baseUrl}/admin/audit-logs?action=auth.registered&page=1&pageSize=20`, {
    headers: { authorization: `Bearer ${adminLogin.json.accessToken}` },
  });
  if (adminResponse.status !== 200) throw new Error(`Admin audit access failed: ${adminResponse.status}`);
  const auditJson = await adminResponse.json();
  if (!Array.isArray(auditJson.items) || auditJson.items.length < 1) throw new Error('Audit endpoint returned no records');

  await pool.end();
  console.log('Phase 9 audit smoke test passed.');
  console.log('Authentication audit events are written and audit-log access is restricted to admins.');
}

main();
