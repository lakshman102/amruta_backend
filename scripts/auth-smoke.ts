import 'dotenv/config';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL ?? 'http://localhost:3000/api';
const email = `phase3-smoke-${Date.now()}@example.test`;
const password = 'Phase3-Smoke-Password-2026!';

async function request(path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  return { status: response.status, json };
}

async function main() {
  const registration = await request('/auth/register', {
    email,
    password,
    displayName: 'Phase 3 Smoke Test',
  });

  if (registration.status !== 201) {
    throw new Error(
      `Registration failed: ${JSON.stringify(registration.json)}`,
    );
  }

  const login = await request('/auth/login', {
    email,
    password,
  });

  if (
    login.status !== 200 ||
    login.json.mfaRequired !== false ||
    !login.json.accessToken
  ) {
    throw new Error(`Login failed: ${JSON.stringify(login.json)}`);
  }

  console.log('Phase 3 auth smoke test passed.');
  console.log(`Registered user: ${registration.json.user.id}`);
  console.log(
    'Registration and password login succeeded; access token was issued.',
  );
}

main();
