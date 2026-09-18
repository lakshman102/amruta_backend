# Phase 3 — Authentication + User Lifecycle

## Implemented

- User registration with normalized email and password validation.
- Password hashing using Node.js `scrypt`; plaintext passwords are never stored.
- Transactional user + profile creation.
- Duplicate-email handling with HTTP 409.
- Login with password verification and generic authentication errors.
- Short-lived HMAC-SHA256 access tokens.
- Authentication middleware that validates the token and checks the active user in PostgreSQL.
- RBAC middleware foundation for later protected domain routes.
- Public registration creates the least-privileged `patient` role; elevated roles are not client-selectable at registration.
- TOTP MFA setup, encrypted-at-rest secret storage, enable/disable verification, and MFA login challenge flow.
- Environment-based authentication and MFA encryption secrets.
- Authentication smoke-test script.

## API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/mfa/verify`
- `POST /api/auth/mfa/setup` — authenticated
- `POST /api/auth/mfa/enable` — authenticated
- `POST /api/auth/mfa/disable` — authenticated

### Register

```json
{
  "email": "patient@example.com",
  "password": "a-strong-password-12",
  "displayName": "Example Patient"
}
```

### Login

```json
{
  "email": "patient@example.com",
  "password": "a-strong-password-12"
}
```

If MFA is disabled, login returns an access token. If MFA is enabled, login returns a short-lived MFA challenge token; the full access token is returned only after `POST /api/auth/mfa/verify` with a valid TOTP code.

### MFA setup

Call `/api/auth/mfa/setup` with a Bearer access token. The response contains an `otpauthUri` suitable for importing into a TOTP authenticator. The secret is encrypted before being stored in PostgreSQL.

Then call `/api/auth/mfa/enable` with `{ "code": "123456" }` to activate MFA.

## Environment

Add to `.env`:

```env
AUTH_JWT_SECRET=replace-with-a-strong-random-secret
AUTH_JWT_TTL_SECONDS=900
MFA_CHALLENGE_TTL_SECONDS=300
MFA_ENCRYPTION_KEY=base64url-encoded-32-byte-key
```

`MFA_ENCRYPTION_KEY` must decode to exactly 32 bytes. Never commit `.env` or production secrets.

## Validation

```bash
npm install
npm run db:migrate
npm run db:verify
npm run build
npm run auth:smoke
```

Start the API before `auth:smoke`.

## Scope boundary

This phase covers the assignment's user lifecycle, authentication, roles/RBAC foundation, and MFA security requirement. Doctor-specific authorization rules are applied when doctor domain endpoints are introduced in later phases.
