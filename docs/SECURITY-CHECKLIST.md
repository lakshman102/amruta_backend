# Security Checklist

This checklist maps the assignment's security requirements to the current implementation.

| Control | Status | Evidence / implementation |
|---|---|---|
| OWASP input validation | Implemented | Request schemas validate body/query/path inputs before domain operations. |
| SQL injection prevention | Implemented | PostgreSQL parameterized queries are used throughout repositories. |
| Authentication | Implemented | Short-lived JWT access tokens and password verification. |
| MFA | Implemented | TOTP MFA with encrypted secret storage. |
| RBAC | Implemented | Authentication plus role authorization middleware. |
| Authorization / ownership | Implemented | Patient/doctor ownership checks on consultation and payment access. |
| Password protection | Implemented | Node `scrypt`; 64-byte derived key, 16-byte random salt, N=16384, r=8, p=1. |
| Secret management | Implemented | JWT and MFA encryption secrets are loaded from environment variables. |
| Sensitive logging | Implemented | Audit metadata is sanitized to exclude password/token/secret/MFA/credential/card fields. |
| Rate limiting | Implemented | Global request rate limiter is configured through environment variables. |
| Idempotent writes | Implemented | Booking and payment workflows use idempotency keys and database constraints. |
| Transactional consistency | Implemented | Core booking/payment/consultation writes use PostgreSQL transactions where required. |
| Audit trail | Implemented | `audit_logs` stores security and core workflow events; admin read access is RBAC-protected. |
| Encryption at rest | Documented | MFA secret is application-encrypted; database/storage encryption is a deployment requirement. |
| Encryption in transit | Documented | Production deployment must terminate TLS and use encrypted database connections. |
| Key rotation | Documented | See `KEY-ROTATION.md`; secrets must be replaced through deployment configuration without committing them. |
| Dependency scanning | Planned in CI | Phase 13 will enforce dependency scanning in the CI pipeline. |
| Secure error handling | Implemented | Centralized HTTP error handling avoids exposing internal stack details to API clients. |
| Security headers | Partially implemented | Express disables `x-powered-by`; broader HTTP security-header hardening is a deployment/CI review item. |

## Sensitive data rules

Never place passwords, access tokens, MFA secrets, authorization headers, payment-card data, or credentials in logs, audit metadata, source control, or `.env` files committed to the repository.

The repository's `.gitignore` excludes local `.env` files. Production secrets must be supplied by the deployment secret manager/environment.
