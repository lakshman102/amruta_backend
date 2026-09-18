import type { Pool, PoolClient } from 'pg';

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  status: string;
  mfaEnabled: boolean;
  mfaSecretEncrypted: string | null;
};

export class AuthRepository {
  constructor(private readonly db: Pool) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRecord>(
      `SELECT id, email, password_hash AS "passwordHash", role, status, mfa_enabled AS "mfaEnabled", mfa_secret_encrypted AS "mfaSecretEncrypted"
       FROM users WHERE email = $1`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRecord>(
      `SELECT id, email, password_hash AS "passwordHash", role, status, mfa_enabled AS "mfaEnabled", mfa_secret_encrypted AS "mfaSecretEncrypted"
       FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async createUserWithProfile(email: string, passwordHash: string, displayName?: string): Promise<UserRecord> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const userResult = await client.query<UserRecord>(
        `INSERT INTO users (email, password_hash, role, status)
         VALUES ($1, $2, 'patient', 'active')
         RETURNING id, email, password_hash AS "passwordHash", role, status, mfa_enabled AS "mfaEnabled", mfa_secret_encrypted AS "mfaSecretEncrypted"`,
        [email, passwordHash],
      );
      const user = userResult.rows[0];
      await client.query(
        'INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)',
        [user.id, displayName ?? null],
      );
      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async setMfaSecret(userId: string, encryptedSecret: string): Promise<void> {
    await this.db.query('UPDATE users SET mfa_secret_encrypted = $1, updated_at = NOW() WHERE id = $2', [encryptedSecret, userId]);
  }

  async setMfaState(userId: string, enabled: boolean): Promise<void> {
    await this.db.query('UPDATE users SET mfa_enabled = $1, updated_at = NOW() WHERE id = $2', [enabled, userId]);
  }

  async clearMfa(userId: string): Promise<void> {
    await this.db.query('UPDATE users SET mfa_enabled = FALSE, mfa_secret_encrypted = NULL, updated_at = NOW() WHERE id = $1', [userId]);
  }
}
