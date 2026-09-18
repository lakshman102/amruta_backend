import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function integer(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid integer environment variable: ${name}`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const value = integer(name, fallback);
  if (value < 1) throw new Error(`Invalid positive integer environment variable: ${name}`);
  return value;
}

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: integer('PORT', 3000),
  databaseUrl: required('DATABASE_URL'),
  dbPoolMax: positiveInteger('DB_POOL_MAX', 20),
  dbIdleTimeoutMs: integer('DB_IDLE_TIMEOUT_MS', 30_000),
  dbConnectionTimeoutMs: integer('DB_CONNECTION_TIMEOUT_MS', 5_000),
  dbStatementTimeoutMs: integer('DB_STATEMENT_TIMEOUT_MS', 15_000),
  rateLimitWindowMs: integer('RATE_LIMIT_WINDOW_MS', 60_000),
  rateLimitMaxRequests: integer('RATE_LIMIT_MAX_REQUESTS', 100),
  jwtSecret: required('AUTH_JWT_SECRET'),
  jwtTtlSeconds: integer('AUTH_JWT_TTL_SECONDS', 900),
  mfaChallengeTtlSeconds: integer('MFA_CHALLENGE_TTL_SECONDS', 300),
  mfaEncryptionKey: required('MFA_ENCRYPTION_KEY'),
});
