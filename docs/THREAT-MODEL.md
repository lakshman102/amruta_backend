# Threat Model

## System boundary

```text
Client
  |
  v
REST API
  |-- Authentication / MFA / RBAC
  |-- Availability
  |-- Booking
  |-- Consultation / Prescription
  |-- Search
  |-- Payments
  |-- Admin Audit Access
  |
  v
PostgreSQL
```

## Assets

- User credentials and account state
- MFA secrets
- Access tokens
- Consultation and prescription data
- Payment records
- Availability and booking state
- Audit history
- Database credentials and application secrets

## Threats and mitigations

| Threat | Impact | Mitigation |
|---|---|---|
| Credential stuffing / brute force | Account takeover | Rate limiting, generic login errors, MFA support. |
| Stolen access token | Unauthorized access | Short JWT TTL and active-user lookup on each authenticated request. |
| MFA secret disclosure | MFA bypass | MFA secret is encrypted at rest and excluded from audit metadata/logging. |
| Broken object-level authorization | Patient/doctor data exposure | Ownership and assigned-doctor checks in domain repositories/services. |
| SQL injection | Database compromise | Parameterized PostgreSQL queries. |
| Double booking race | Incorrect booking state | Transaction + row lock + database exclusion/unique constraints. |
| Payment duplicate write | Duplicate financial record | Transaction + consultation lock + idempotency key + unique consultation constraint. |
| Sensitive data in logs | Data leakage | Structured logging and audit metadata sanitization. |
| Malicious oversized input | Resource exhaustion | JSON body limit, validation, and rate limiting. |
| Secret committed to source control | Credential compromise | Environment-based secrets and `.gitignore` for `.env`. |
| Unauthorized audit-log access | Compliance/security exposure | Audit endpoint is restricted to the `admin` role. |
| Dependency vulnerability | Supply-chain risk | Dependency scanning is a required CI control and is finalized in Phase 13. |
| Transport interception | Credential/data exposure | Production TLS and encrypted DB transport are deployment requirements. |

## Attack-surface analysis

### Public endpoints

- Registration
- Login
- MFA challenge verification
- Health/readiness
- Doctor search and availability reads

### Authenticated endpoints

- MFA setup/enable/disable
- Availability mutations
- Consultation/booking workflows
- Prescription workflow
- Payment workflow

### Privileged endpoint

- Admin audit-log retrieval

The primary security boundaries are authentication, role authorization, resource ownership, database constraints, and secret handling.
