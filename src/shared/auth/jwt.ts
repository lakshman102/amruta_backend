import { createHmac, timingSafeEqual } from 'node:crypto';

export type AuthTokenPayload = {
  sub: string;
  role: string;
  type: 'access' | 'mfa';
  iat: number;
  exp: number;
};

type JwtHeader = { alg: 'HS256'; typ: 'JWT' };

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

export function createToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>, secret: string, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const body: AuthTokenPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedBody = base64Url(JSON.stringify(body));
  const input = `${encodedHeader}.${encodedBody}`;
  return `${input}.${sign(input, secret)}`;
}

export function verifyToken(token: string, secret: string): AuthTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedBody, signature] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedBody}`, secret);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as JwtHeader;
    const payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8')) as AuthTokenPayload;
    const now = Math.floor(Date.now() / 1000);

    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    if (!payload.sub || !payload.role || !payload.type || !Number.isInteger(payload.exp) || payload.exp <= now) return null;
    if (!Number.isInteger(payload.iat) || payload.iat > now + 30) return null;
    if (payload.type !== 'access' && payload.type !== 'mfa') return null;

    return payload;
  } catch {
    return null;
  }
}
