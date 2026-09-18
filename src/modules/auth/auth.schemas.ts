export type RegisterInput = { email: string; password: string; displayName?: string };
export type LoginInput = { email: string; password: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRegisterInput(body: unknown): RegisterInput {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');
  const input = body as Record<string, unknown>;
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const displayName = input.displayName === undefined ? undefined : String(input.displayName).trim();
  if (!emailPattern.test(email) || email.length > 320 || password.length < 12 || password.length > 128) throw new Error('Invalid email or password');
  if (displayName !== undefined && displayName.length > 120) throw new Error('Invalid display name');
  return { email, password, displayName };
}

export function parseLoginInput(body: unknown): LoginInput {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');
  const input = body as Record<string, unknown>;
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!emailPattern.test(email) || email.length > 320 || password.length === 0 || password.length > 128) throw new Error('Invalid email or password');
  return { email, password };
}
