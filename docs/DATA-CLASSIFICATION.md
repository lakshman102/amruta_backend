# Data Classification

Classification is based on the data actually represented by the current core model.

| Class | Examples | Handling |
|---|---|---|
| Public | Health/readiness status; non-sensitive search output | May be returned by explicitly public endpoints. |
| Internal | Operational timestamps and non-sensitive system state | Restrict to application/API consumers as appropriate. |
| Sensitive | Email, user role/status, availability, booking/payment metadata, audit metadata | Require authentication/authorization where exposed; do not log unnecessarily. |
| Highly Sensitive | Password hashes, MFA encrypted secrets, consultation/prescription content, application secrets | Strong access control; encryption where applicable; never expose in logs or public responses. |

## Storage requirements

- Passwords are never stored in plaintext; only `scrypt` hashes are stored.
- MFA secrets are encrypted before database storage.
- Application secrets are supplied through environment/deployment secret management.
- Production PostgreSQL/storage must use encryption at rest.
- Production network traffic must use TLS/encrypted database transport.
