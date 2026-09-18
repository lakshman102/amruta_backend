ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT;
