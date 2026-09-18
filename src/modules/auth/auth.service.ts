import { AuthRepository } from './auth.repository.js';
import { hashPassword, verifyPassword } from '../../shared/security/password.js';
import { createToken, verifyToken } from '../../shared/auth/jwt.js';
import { config } from '../../config/config.js';
import { HttpError } from '../../shared/errors/http-error.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { createOtpAuthUri, decryptMfaSecret, encryptMfaSecret, generateMfaSecret, verifyTotp } from '../../shared/security/mfa.js';
import { AuditRepository } from '../audit/audit.repository.js';

export class AuthService {
  constructor(private readonly repository: AuthRepository, private readonly audit: AuditRepository) {}

  async register(input: RegisterInput) {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) throw new HttpError(409, 'An account with that email already exists');
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await this.repository.createUserWithProfile(input.email, passwordHash, input.displayName);
      await this.audit.create(user.id, 'auth.registered', 'user', user.id, { role: user.role });
      return { user: { id: user.id, email: user.email, role: user.role, status: user.status } };
    } catch (error) {
      if (isUniqueViolation(error)) throw new HttpError(409, 'An account with that email already exists');
      throw error;
    }
  }

  async login(input: LoginInput) {
    const user = await this.repository.findByEmail(input.email);
    const validPassword = user ? await verifyPassword(input.password, user.passwordHash) : false;
    if (!user || !validPassword || user.status !== 'active') {
      await this.audit.create(null, 'auth.login_failed', 'user', null, { reason: 'invalid_credentials' });
      throw new HttpError(401, 'Invalid email or password');
    }

    if (user.mfaEnabled) {
      const challengeToken = createToken({ sub: user.id, role: user.role, type: 'mfa' }, config.jwtSecret, config.mfaChallengeTtlSeconds);
      await this.audit.create(user.id, 'auth.mfa_challenge_issued', 'user', user.id);
      return { mfaRequired: true, challengeToken };
    }
    await this.audit.create(user.id, 'auth.login_succeeded', 'user', user.id);
    return this.issueAccessToken(user.id, user.email, user.role);
  }

  async verifyMfa(challengeToken: string, code: string) {
    const payload = verifyToken(challengeToken, config.jwtSecret);
    if (!payload || payload.type !== 'mfa') throw new HttpError(401, 'Invalid MFA challenge');
    const user = await this.repository.findById(payload.sub);
    if (!user || user.status !== 'active' || !user.mfaEnabled || !user.mfaSecretEncrypted) throw new HttpError(401, 'Invalid MFA challenge');
    let secret: string;
    try { secret = decryptMfaSecret(user.mfaSecretEncrypted, config.mfaEncryptionKey); } catch { throw new HttpError(401, 'Invalid MFA challenge'); }
    if (!verifyTotp(secret, code)) {
      await this.audit.create(user.id, 'auth.mfa_failed', 'user', user.id, { reason: 'invalid_code' });
      throw new HttpError(401, 'Invalid MFA code');
    }
    await this.audit.create(user.id, 'auth.mfa_verified', 'user', user.id);
    return this.issueAccessToken(user.id, user.email, user.role);
  }

  async setupMfa(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user) throw new HttpError(404, 'User not found');
    if (user.mfaEnabled) throw new HttpError(409, 'MFA is already enabled');
    const secret = generateMfaSecret();
    await this.repository.setMfaSecret(userId, encryptMfaSecret(secret, config.mfaEncryptionKey));
    await this.audit.create(userId, 'auth.mfa_setup_started', 'user', userId);
    return { otpauthUri: createOtpAuthUri(secret, user.email) };
  }

  async enableMfa(userId: string, code: string) {
    const user = await this.repository.findById(userId);
    if (!user?.mfaSecretEncrypted) throw new HttpError(400, 'MFA setup is required first');
    let secret: string;
    try { secret = decryptMfaSecret(user.mfaSecretEncrypted, config.mfaEncryptionKey); } catch { throw new HttpError(400, 'MFA setup is invalid'); }
    if (!verifyTotp(secret, code)) throw new HttpError(400, 'Invalid MFA code');
    await this.repository.setMfaState(userId, true);
    await this.audit.create(userId, 'auth.mfa_enabled', 'user', userId);
    return { mfaEnabled: true };
  }

  async disableMfa(userId: string, code: string) {
    const user = await this.repository.findById(userId);
    if (!user?.mfaEnabled || !user.mfaSecretEncrypted) throw new HttpError(400, 'MFA is not enabled');
    let secret: string;
    try { secret = decryptMfaSecret(user.mfaSecretEncrypted, config.mfaEncryptionKey); } catch { throw new HttpError(400, 'MFA setup is invalid'); }
    if (!verifyTotp(secret, code)) throw new HttpError(400, 'Invalid MFA code');
    await this.repository.clearMfa(userId);
    await this.audit.create(userId, 'auth.mfa_disabled', 'user', userId);
    return { mfaEnabled: false };
  }

  private issueAccessToken(id: string, email: string, role: string) {
    return {
      mfaRequired: false,
      accessToken: createToken({ sub: id, role, type: 'access' }, config.jwtSecret, config.jwtTtlSeconds),
      user: { id, email, role },
    };
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}
