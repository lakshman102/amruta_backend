# Architecture and Flow --- Amrutam Telemedicine Backend

## 1. Architectural Objective

The assignment asks for a production-grade backend focused on
scalability, reliability, security, and observability.

The target operating requirements are:

-   100k daily consultations
-   p95 reads below 200 ms
-   p95 writes below 500 ms
-   99.95% availability
-   Encryption, MFA and RBAC
-   Metrics, logs and traces

## 2. Logical Architecture

``` mermaid
flowchart LR
    C[Client] --> API[REST or GraphQL API]

    API --> AUTH[Auth / RBAC]
    API --> USER[User Lifecycle]
    API --> DOC[Doctor Availability]
    API --> BOOK[Booking]
    API --> CONSULT[Consultation]
    API --> SEARCH[Search / Filtering]
    API --> ADMIN[Admin Analytics]

    USER --> PG[(PostgreSQL)]
    DOC --> PG
    BOOK --> PG
    CONSULT --> PG
    SEARCH --> PG
    ADMIN --> PG

    BOOK --> REDIS[(Redis - Optional)]
    SEARCH --> REDIS

    BOOK --> JOB[Async Jobs]
    CONSULT --> JOB

    USER --> AUDIT[Audit Logging]
    BOOK --> AUDIT
    CONSULT --> AUDIT
    ADMIN --> AUDIT
    AUDIT --> PG

    API --> OBS[Metrics / Logs / Traces]
    JOB --> OBS
```

## 3. Module Boundaries

The backend is planned as modular components rather than prematurely
forcing every domain into an independent deployment.

Modules:

-   User lifecycle
-   Authentication/RBAC
-   Doctor availability
-   Booking
-   Consultation
-   Prescription
-   Search/filtering
-   Payments
-   Audit/compliance
-   Admin analytics

Dependency injection is required by the assignment and will be used to
keep these modules testable and replaceable.

## 4. Booking Flow

``` mermaid
sequenceDiagram
    participant U as User
    participant API as API
    participant AUTH as Auth/RBAC
    participant BOOK as Booking Module
    participant DB as PostgreSQL
    participant AUDIT as Audit Log
    participant JOB as Async Job

    U->>API: Booking write request
    API->>AUTH: Authenticate + authorize
    AUTH-->>API: Authorized
    API->>BOOK: Create booking
    BOOK->>BOOK: Validate idempotency
    BOOK->>DB: Begin transaction
    BOOK->>DB: Validate/protect availability
    DB-->>BOOK: Availability state
    BOOK->>DB: Persist booking state
    BOOK->>DB: Commit transaction
    BOOK->>AUDIT: Record audit event
    BOOK->>JOB: Trigger heavy async work
    API-->>U: Booking result
```

## 5. Concurrency Strategy

The booking operation handles concurrent requests by locking the selected
availability row inside a PostgreSQL transaction. The implementation uses
`SELECT ... FOR UPDATE`, then checks the slot state and existing
consultation before creating the consultation and marking the slot
unavailable in the same transaction.

The resulting guarantees are:

-   Two conflicting requests cannot both consume the same slot.
-   The booking and slot state transition commit or roll back together.
-   A repeated request with the same patient and idempotency key returns
    the original consultation instead of creating another one.
-   The database unique constraint on `consultations.availability_slot_id`
    provides an additional duplicate-booking safeguard.

## 6. Idempotency Strategy

All required write operations will be reviewed for idempotency.

For booking, the repeated-request identity is the authenticated patient plus
the `Idempotency-Key` request header. The key is stored on the existing
`consultations` table with a unique partial index. A completed repeat returns
the original consultation with HTTP 200, while a new booking returns HTTP
201. Missing/invalid keys are rejected before the write.

The assignment explicitly requires idempotency for writes.

## 7. Retry and Backoff

Retry handling will distinguish:

-   Transient failures
-   Permanent validation/business failures
-   Concurrency conflicts
-   Async job failures

Retries will use controlled backoff and will not be used for operations
where repeating the action could cause an unsafe duplicate effect.

## 8. Transaction Management

PostgreSQL transactions will be used where multiple state changes must
succeed or fail together.

For workflows that cross asynchronous boundaries, the design will
evaluate saga-style coordination rather than attempting to maintain a
long-running database transaction.

## 9. Caching

Redis is optional.

If introduced, it will support only clearly justified read/performance
use cases. The design will document:

-   Cached data
-   TTL/invalidation behavior
-   Consistency expectations
-   Failure behavior when Redis is unavailable

## 10. Data Partitioning

The assignment requires a data-partitioning design.

Partitioning will be evaluated against:

-   Expected consultation volume
-   Growth of audit data
-   Query patterns
-   PostgreSQL operational complexity

Only justified partitioning will be implemented.

## 11. ER Diagram

``` mermaid
erDiagram
    users ||--o| profiles : has
    users ||--o| doctors : has
    doctors ||--o{ availability_slots : owns
    availability_slots ||--o| consultations : used_by
    consultations ||--o{ prescriptions : contains
    consultations ||--o| payments : has
    users ||--o{ audit_logs : creates

    users {
        /* Columns intentionally unspecified by assignment */
    }
    profiles {
        /* Columns intentionally unspecified by assignment */
    }
    doctors {
        /* Columns intentionally unspecified by assignment */
    }
    availability_slots {
        /* Columns intentionally unspecified by assignment */
    }
    consultations {
        /* Columns intentionally unspecified by assignment */
    }
    prescriptions {
        /* Columns intentionally unspecified by assignment */
    }
    payments {
        /* Columns intentionally unspecified by assignment */
    }
    audit_logs {
        /* Columns intentionally unspecified by assignment */
    }
```

## 12. Security Architecture

The security design must cover:

-   Authentication
-   MFA
-   RBAC
-   Input validation
-   Rate limiting
-   Encryption
-   Key rotation
-   Audit logging
-   OWASP mitigations
-   Attack-surface analysis
-   Data classification
-   Dependency scanning
-   Environment-based secret management

## 13. Observability Architecture

The system will expose three required observability dimensions:

### Metrics

Used for: - Request latency - Error behavior - System health -
Performance targets

### Logs

Used for: - Application events - Errors - Security/audit events -
Operational investigation

### Traces

Used for: - End-to-end request flow - Cross-module timing - Async
workflow visibility

## 14. Infrastructure and Delivery

The assignment requires infrastructure as code and containerized CI/CD.

The implementation plan therefore separates:

-   Application code
-   Container build
-   Infrastructure definitions
-   CI pipeline
-   Automated tests
-   Dependency scanning

The exact infrastructure provider is not specified by the assignment and
therefore will not be assumed at this stage.

## 15. Backup and DR

The design will document:

-   Database backup approach
-   Recovery process
-   Failure scenarios
-   Recovery verification

The assignment does not provide explicit RPO/RTO values, so none are
invented here.

## 16. Architecture Decision Rule

For every architecture decision, use this order:

1.  Explicit assignment requirement
2.  Required behavior to satisfy that requirement
3.  Simplest production-grade design that satisfies it
4.  Only then introduce infrastructure/tooling complexity if justified

This keeps the implementation within the assignment scope.

## Consultation lifecycle API (Phase 6)

`PATCH /api/consultations/:consultationId/status` updates an authorized consultation through validated lifecycle states (`scheduled`, `in_progress`, `completed`, `cancelled`). The service enforces role-specific transitions and the repository locks the consultation row inside a PostgreSQL transaction.

`POST /api/consultations/:consultationId/prescriptions` allows the assigned doctor to create a prescription after the consultation is completed. `GET /api/consultations/:consultationId/prescriptions` allows the patient or assigned doctor to retrieve prescriptions. Prescription creation locks and re-checks the consultation state in a transaction to keep authorization and lifecycle checks consistent.

## Admin Analytics Flow

Admin analytics is a read-only application path over the existing PostgreSQL domain model:

```text
Admin -> JWT authentication -> admin RBAC -> Analytics Service -> PostgreSQL aggregates -> JSON response
```

Consultation, availability, and payment activity metrics are filtered in PostgreSQL when `from`/`to` timestamps are supplied. This keeps aggregation work in the database and avoids loading raw rows into the application process.

## Observability

HTTP requests receive an `x-request-id` and W3C-compatible `traceparent`. Completion logs are structured JSON and include correlation and latency metadata without request bodies or secrets. Prometheus-compatible HTTP metrics are exposed at `/api/metrics`. This provides a lightweight observability foundation while keeping telemetry infrastructure external to the application process.

## Reliability, Scalability & Disaster Recovery

The API is designed to remain stateless so instances can scale horizontally. PostgreSQL connection pooling is bounded and uses connection/idle/statement timeouts to protect the database from resource exhaustion. Readiness checks PostgreSQL and returns 503 when the dependency is unavailable.

Retries use bounded exponential backoff and are opt-in per operation. Business writes are not blindly retried; booking and payment use PostgreSQL transactions, row locks, and idempotency keys. PostgreSQL remains the source of truth for concurrency-sensitive decisions.

Redis is optional per the assignment and is not required by the current implementation. If profiling later shows a cache need, doctor search/availability reads are cache candidates with short TTLs; booking/payment decisions must bypass cache.

For growth, audit logs are the first candidate for time-based partitioning, with consultations considered later if volume/retention warrants it. Production backups should use encrypted automated backups plus WAL archiving and point-in-time recovery. The Phase 12 design targets RPO <= 15 minutes and RTO <= 60 minutes, subject to the actual production infrastructure and restore-test results.

## Testing and CI/CD

The delivery pipeline validates database migrations, TypeScript types, automated tests, production compilation, dependency security, and Docker image construction. Critical workflow behavior also has phase-specific smoke scripts for local end-to-end validation.
