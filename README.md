# Amrutam Telemedicine Backend --- Interview Assignment

## 1. Assignment Overview

The assignment is to build a **production-grade backend for Amrutam's
telemedicine system**, with emphasis on:

-   Scalability
-   Reliability
-   Security
-   Observability

The assignment explicitly requires code, infrastructure as code, design
documentation, automated tests, and documentation.

The target scale is **100,000 daily consultations**, with: - Read
latency: **p95 \< 200 ms** - Write latency: **p95 \< 500 ms** -
Availability: **99.95%** - Security: encryption, MFA, RBAC -
Observability: metrics, logs, traces - CI/CD with containerized
deployment

The expected submission time is **4--5 days**, and the final submission
must include the repository, documentation, and a **5-minute demo
video**.

## 2. Scope We Must Implement

The assignment defines these core workflows:

1.  User lifecycle --- authentication and roles
2.  Doctor availability and booking
3.  Consultation lifecycle and prescriptions
4.  Search and filtering
5.  Compliance and audit trails
6.  Admin analytics

The core data model named by the assignment contains:

-   `users`
-   `profiles`
-   `doctors`
-   `availability_slots`
-   `consultations`
-   `prescriptions`
-   `payments`
-   `audit_logs`

### Important boundary

The assignment names the core tables but **does not specify individual
columns/fields**. Therefore, this documentation does not invent a field
list. Individual fields will be derived only when required by an
explicit workflow/API contract during implementation.

## 3. Required Architecture Tasks

The implementation/design must cover:

-   High-level architecture and data flow
-   Booking flow sequence diagram
-   ER diagram
-   API schema
-   Retry and backoff strategies
-   Data partitioning
-   Caching and concurrency handling
-   Transaction management and sagas
-   Backup and disaster-recovery strategy

## 4. Technology Constraints

The assignment permits:

-   Language: **Node.js, Go, or Python**
-   Database: **PostgreSQL**
-   Redis: optional
-   API: REST or GraphQL
-   Modular services with dependency injection

The implementation must also include:

-   Idempotency for writes
-   Async jobs for heavy tasks
-   Rate limiting
-   Input validation
-   Secrets through environment variables

## 5. Security Requirements

Security documentation and implementation must address:

-   OWASP mitigations
-   Attack-surface analysis
-   Data classification
-   Encryption
-   Key rotation
-   Audit logs
-   Dependency scanning
-   MFA
-   RBAC

The rubric explicitly states that missing **critical security or
idempotency** can cause failure.

## 6. Observability Requirements

The system must provide:

-   Metrics
-   Logs
-   Traces

Observability is a required deliverable, not an optional enhancement.

## 7. CI/CD and Infrastructure

The submission must contain:

-   Infrastructure as code
-   Containerized deployment
-   CI pipeline
-   Automated tests
-   Dependency scanning

## 8. High-Level Architecture

``` mermaid
flowchart LR
    Client[Client] --> API[Backend API]
    API --> Auth[Authentication / RBAC]
    API --> Core[Core Domain Modules]
    Core --> DB[(PostgreSQL)]
    Core --> Cache[(Redis - Optional)]
    Core --> Jobs[Async Jobs]
    Jobs --> DB
    Core --> Audit[Audit Trail]
    Audit --> DB

    API --> Obs[Observability]
    Core --> Obs
    Jobs --> Obs

    CI[CI/CD Pipeline] --> Container[Containerized Deployment]
    Container --> API
    Container --> Jobs
```

This is a logical architecture derived from the assignment requirements.
Detailed service/module boundaries will be finalized during
implementation without introducing functionality outside the assignment
scope.

## 9. Booking Flow

The booking workflow must specifically address concurrency, idempotency,
transactions, retries, and auditability.

``` mermaid
sequenceDiagram
    participant U as User
    participant API as Backend API
    participant D as Doctor Availability
    participant DB as PostgreSQL
    participant J as Async Jobs
    participant A as Audit Logs

    U->>API: Booking request
    API->>API: Validate + authenticate + authorize
    API->>D: Check requested availability
    D->>DB: Read / lock slot as required
    DB-->>D: Slot state
    D->>DB: Transactional booking update
    DB-->>D: Booking result
    D->>A: Record audit event
    D->>J: Trigger required async work
    J-->>API: Async processing result
    API-->>U: Booking response
```

The exact API operations, status transitions, and transaction boundaries
will be documented from the implemented contract.

## 10. Data Model

The assignment requires the following core tables:

``` mermaid
erDiagram
    users
    profiles
    doctors
    availability_slots
    consultations
    prescriptions
    payments
    audit_logs

    users ||--o| profiles : has
    users ||--o| doctors : has
    doctors ||--o{ availability_slots : provides
    availability_slots ||--o| consultations : supports
    consultations ||--o{ prescriptions : has
    consultations ||--o| payments : has
    users ||--o{ audit_logs : generates
```

The relationships shown above are a planning representation based on the
named domain concepts; exact cardinalities and foreign-key details will
be validated while designing the schema.

## 11. Performance and Reliability Approach

The design will explicitly address the assignment's targets:

### Reads

Target: **p95 \< 200 ms**

Approach: - Efficient PostgreSQL queries - Appropriate indexes - Caching
where justified by the assignment's requirements - Avoid unnecessary
synchronous work

### Writes

Target: **p95 \< 500 ms**

Approach: - Short database transactions - Idempotent write operations -
Async processing for heavy work - Controlled retries with backoff

### Availability

Target: **99.95%**

Approach: - Failure-aware application behavior - Transaction safety -
Retry strategy - Backup and DR strategy - Containerized deployment

These are implementation approaches, not additional business
requirements.

## 12. Concurrency and Idempotency

Booking is a concurrency-sensitive workflow. The implementation will
therefore explicitly design:

-   How a slot is protected from conflicting writes
-   Transaction boundaries
-   Idempotency for repeated write requests
-   Retry behavior
-   Failure behavior

No duplicate business behavior will be added beyond what is needed to
satisfy these assignment requirements.

## 13. Retry and Backoff

The architecture documentation will define:

-   Which operations are retryable
-   Which failures must not be retried
-   Backoff behavior
-   Idempotency requirements around retries
-   Failure handling for asynchronous work

Retries will not be applied blindly to all operations.

## 14. Transaction Management and Sagas

The implementation will identify:

-   Operations requiring database transactions
-   Operations that can safely be asynchronous
-   Where a saga-style workflow is required by the distributed workflow
-   Failure and recovery behavior

The design will avoid distributed complexity where a PostgreSQL
transaction is sufficient.

## 15. Caching

Redis is explicitly optional in the assignment.

Therefore: - PostgreSQL remains the required database. - Redis will only
be used where it directly supports the assignment's
performance/scalability requirements. - Cache invalidation and
consistency will be documented if Redis is introduced.

## 16. Data Partitioning

The architecture documentation will evaluate partitioning against the
stated scale and data model. Partitioning will only be introduced where
justified by the assignment's scale or operational requirements.

## 17. Backup and Disaster Recovery

The architecture documentation will define:

-   Backup strategy
-   Recovery strategy
-   Failure scenarios
-   Data-recovery considerations

No unsupported recovery-time or recovery-point targets will be invented
unless the assignment later provides them.

## 18. Testing Strategy

The repository must include automated tests.

Testing will cover the implemented requirements, with particular
attention to:

-   Authentication and authorization
-   Booking concurrency
-   Write idempotency
-   Consultation lifecycle
-   Prescription workflow
-   Search/filter behavior
-   Audit logging
-   Error handling
-   Security controls

The exact test cases will be derived from the final API/domain
contracts.

## 19. Documentation Deliverables

The final repository should contain:

``` text
README.md
ARCHITECTURE.md
SECURITY.md
THREAT-MODEL.md
API-SCHEMA/
TESTING.md
INFRA/
CI/
src/
tests/
```

These names are a proposed repository organization for the required
deliverables; they do not add product functionality.

## 20. Implementation Principles

The implementation will follow these principles:

1.  Requirements first
2.  Explicit domain boundaries
3.  Modular design
4.  Dependency injection
5.  Input validation
6.  Idempotent writes
7.  Transaction safety
8.  Controlled concurrency
9.  Async processing for heavy tasks
10. Security by design
11. Observable operations
12. Automated testing
13. Containerized deployment
14. Infrastructure as code
15. No unnecessary features outside the assignment

## 21. Evaluation Alignment

The assignment rubric allocates:

  Area              Weight
  --------------- --------
  Architecture          20
  Core Flows            20
  Code Quality          15
  Security              10
  Observability         10
  Scalability           10
  Infra/CI              10
  Bonus                +10

A critical security or idempotency omission can fail the submission.

## 22. Final Submission

The assignment expects:

-   Git repository with code and infrastructure
-   README with setup
-   OpenAPI or GraphQL schema
-   Architecture document of 2--4 pages
-   Tests and CI pipeline
-   Observability setup
-   Security checklist and threat model
-   5-minute demo video

## 14. Implemented Booking API

### Create consultation

`POST /api/consultations`

Authentication: Bearer access token. Role: `patient`.

Required header: `Idempotency-Key` (1–128 characters).

Request body:

```json
{
  "availabilitySlotId": "<slot-uuid>"
}
```

The booking transaction locks the availability row, verifies it is still
available, creates the consultation, and marks the slot unavailable before
committing. Reusing the same idempotency key for the same patient returns the
original consultation rather than creating a duplicate.

### Get consultation

`GET /api/consultations/:consultationId`

Authentication: Bearer access token. Roles: `patient` or `doctor`.

A patient can retrieve their own consultation; the associated doctor can
retrieve that consultation.

## Phase 6 consultation APIs

- `PATCH /api/consultations/:consultationId/status` — update an authorized consultation lifecycle state.
- `POST /api/consultations/:consultationId/prescriptions` — assigned doctor creates a prescription after completion.
- `GET /api/consultations/:consultationId/prescriptions` — patient or assigned doctor retrieves prescriptions.

Run the Phase 6 smoke test with `npm run consultation:smoke`.

## Phase 7

Doctor search and filtering is available at `GET /api/doctors/search`. See `PHASE-7.md`.

## Phase 8 Payments

Payment creation is available at `POST /api/consultations/:consultationId/payments` for the authenticated patient who owns the consultation. The request requires an `Idempotency-Key` header and accepts `amount` and `currency`.

Payment retrieval is available to the consultation's patient or assigned doctor:

- `GET /api/consultations/:consultationId/payments`
- `GET /api/payments/:paymentId`

Payment creation is transactional, locks the consultation row to serialize concurrent requests, prevents more than one payment per consultation, and records a `payment.created` audit event in the same transaction. The initial payment status is `pending`; no external payment provider or provider-specific workflow is introduced because the assignment does not specify one.

Run the Phase 8 smoke test with `npm run payment:smoke`.

## Phase 9 — Compliance and Security

Phase 9 adds the compliance/security layer required by the assignment:

- Dedicated `audit_logs` repository/service and admin-only audit endpoint.
- Security and MFA audit events plus core authenticated workflow audit events.
- Audit metadata sanitization to prevent credential/secret-like fields from being stored.
- Security checklist, threat model, data classification, and key-rotation documentation.
- Encryption-at-rest and encryption-in-transit deployment requirements.
- Dependency scanning is carried into the CI implementation in Phase 13.

Admin audit API: `GET /api/admin/audit-logs`.

## Admin Analytics

Phase 10 adds the admin-only analytics endpoint:

```text
GET /api/admin/analytics
```

Optional `from` and `to` ISO timestamp query parameters filter availability, consultation, and payment activity. Analytics are calculated with PostgreSQL aggregate queries over the existing domain tables. No new analytics-specific domain tables are required.

Run the Phase 10 smoke test with:

```bash
npm run analytics:smoke
```

## Observability

Phase 11 adds request correlation, structured request/error logging, W3C Trace Context propagation, and Prometheus-compatible HTTP metrics. The metrics endpoint is `GET /api/metrics`; health and readiness remain `GET /api/health` and `GET /api/ready`. Sensitive request data and authentication/payment secrets are not logged.

## Phase 12 — Reliability, Scalability & DR

- Configurable PostgreSQL pool size, connection timeout, idle timeout, and statement timeout.
- Readiness returns HTTP 503 when PostgreSQL is unavailable.
- Bounded exponential backoff utility for explicitly retryable operations.
- Booking and payment retain transaction locking and idempotency as concurrency safeguards.
- Reliability, caching, partitioning, scaling, backup, RPO/RTO, and restore guidance are documented in `PHASE-12.md`.

### Reliability smoke test

```bash
npm run reliability:smoke
```

## Testing & CI/CD

Phase 13 adds automated tests and a GitHub Actions CI pipeline. Run `npm test` for the unit-level reliability and validation suite, `npm run typecheck` for TypeScript validation, and `npm run build` for the production build. The CI workflow also runs migrations, database verification, dependency auditing, and a Docker build.


## Phase 14 — Final Review and Demo

Final submission artifacts:

- `API-SCHEMA/openapi.yaml` — implemented REST API contract.
- `FINAL-REVIEW.md` — requirement-to-evidence checklist and final scope notes.
- `DEMO-GUIDE.md` — five-minute interview demonstration flow.
- `INFRASTRUCTURE.md` — container and infrastructure-as-code explanation.

The repository retains the assignment's required scope and does not introduce unrelated product functionality.
