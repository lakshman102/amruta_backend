# Implementation Plan --- Amrutam Telemedicine Backend

## Working Rule

We will implement the assignment in phases. Before each phase:

1.  Explain what the phase does.
2.  Explain why it is required.
3.  Explain how it will work.
4.  Identify the exact assignment requirements it satisfies.
5.  Wait for approval.
6.  Implement only that phase.
7.  Validate the phase.
8.  Explain the completed result.
9.  Ask for approval before the next phase.

No feature will be added merely because it is common in a production
system. It must support an explicit assignment requirement.

## Phase 0 --- Requirements, README and Architecture Baseline

### Goal

Freeze the scope before writing application features.

### Work

-   Analyze assignment requirements.
-   Create README.
-   Create implementation plan.
-   Create architecture/data-flow documentation.
-   Create booking sequence diagram.
-   Create ER diagram.
-   Define technology choice from the permitted options.
-   Define repository/module structure.
-   Map every planned component to an assignment requirement.

### Output

Documentation only. No business feature implementation.

### Completion Check

The team should be able to answer: - What must be built? - What is
explicitly required? - What is not specified? - How does each component
map to the rubric?

------------------------------------------------------------------------

## Phase 1 --- Project Foundation

### Goal

Create a clean, runnable backend foundation.

### Work

-   Repository structure
-   Application bootstrap
-   Modular architecture
-   Dependency injection structure
-   Configuration through environment variables
-   PostgreSQL connection
-   Container setup
-   Base error handling
-   Base input-validation mechanism
-   Base logging/observability foundation

### Requirement Mapping

-   Language/runtime
-   PostgreSQL
-   Modular services with DI
-   Secrets via env vars
-   Containerized deployment
-   Observability foundation

### Completion Check

The application starts cleanly and the foundational infrastructure is
testable.

------------------------------------------------------------------------

## Phase 2 --- Database and Core Domain Model

### Goal

Implement the database model required by the assignment.

### Required Tables

-   users
-   profiles
-   doctors
-   availability_slots
-   consultations
-   prescriptions
-   payments
-   audit_logs

### Work

-   Schema/migrations
-   Required relationships
-   Constraints
-   Indexes
-   Transaction boundaries
-   Data-access modules

### Important Constraint

The assignment gives table names but does not provide a complete
column-level specification. Fields will be introduced only as necessary
to implement the defined workflows/API contract.

### Completion Check

The schema supports all required workflows without adding unrelated
domain entities.

------------------------------------------------------------------------

## Phase 3 --- Authentication and User Lifecycle

### Goal

Implement user lifecycle requirements.

### Work

-   Authentication
-   Roles
-   MFA requirement
-   RBAC
-   Secure input handling
-   Relevant audit events

### Requirement Mapping

-   User lifecycle
-   Authentication
-   Roles
-   MFA
-   RBAC
-   Security
-   Audit trails

### Completion Check

Protected operations enforce authentication and role-based
authorization.

------------------------------------------------------------------------

## Phase 4 --- Doctor Availability

### Goal

Implement doctor availability management required for booking.

### Work

-   Availability-slot workflow
-   Validation
-   Persistence
-   Authorization
-   Concurrency considerations

### Requirement Mapping

-   Doctor availability
-   Search/filter support where applicable
-   Concurrency handling

### Completion Check

Availability can be safely represented and queried for booking.

------------------------------------------------------------------------

## Phase 5 --- Booking Workflow

### Goal

Implement the core booking flow.

### Work

-   Booking API
-   Availability validation
-   Concurrency protection
-   Transaction management
-   Idempotent writes
-   Retry/backoff behavior
-   Audit trail
-   Relevant async processing

### Requirement Mapping

-   Doctor availability and booking
-   Idempotency
-   Transactions
-   Sagas where required
-   Retry/backoff
-   Audit trails
-   Scalability/reliability

### Completion Check

Repeated/conflicting booking requests cannot incorrectly create
duplicate bookings or consume the same availability concurrently.

------------------------------------------------------------------------

## Phase 6 --- Consultation and Prescription Lifecycle

### Goal

Implement consultation lifecycle and prescriptions.

### Work

-   Consultation lifecycle
-   Prescription workflow
-   Required authorization
-   Transactional behavior
-   Audit events
-   Async work where appropriate

### Requirement Mapping

-   Consultation lifecycle
-   Prescriptions
-   Compliance/audit trails

### Completion Check

The required consultation/prescription workflow works end-to-end with
correct authorization and persistence.

------------------------------------------------------------------------

## Phase 7 --- Search and Filtering

### Goal

Implement required search/filter behavior.

### Work

-   Search APIs
-   Filtering
-   Query optimization
-   PostgreSQL indexing
-   Caching only if justified

### Requirement Mapping

-   Search and filtering
-   Read latency target
-   Scalability
-   Caching

### Completion Check

Queries are efficient and measurable against the p95 read requirement.

------------------------------------------------------------------------

## Phase 8 --- Payments and Required Workflow Integration

### Goal

Implement the `payments` domain only to the extent required by the
assignment's core system/data model and workflow.

### Work

-   Payment data model/API required by the implemented scope
-   Transaction boundaries
-   Idempotency where writes exist
-   Auditability
-   Failure/retry behavior where applicable

### Important Boundary

No payment-provider-specific functionality will be invented unless the
assignment requires it.

------------------------------------------------------------------------

## Phase 9 --- Compliance and Audit Trails

### Goal

Make auditability a first-class requirement.

### Work

-   Audit logging
-   Security-relevant events
-   Data classification
-   Encryption requirements
-   Key rotation documentation
-   OWASP mitigation checklist
-   Attack-surface analysis
-   Threat model

### Requirement Mapping

-   Compliance and audit trails
-   Security checklist
-   Threat model
-   OWASP mitigation
-   Encryption
-   Key rotation
-   Dependency scanning

### Completion Check

Security documentation maps threats to concrete mitigations implemented
or explicitly documented.

------------------------------------------------------------------------

## Phase 10 --- Admin Analytics

### Goal

Implement the required admin analytics workflow.

### Work

-   Admin authorization
-   Analytics queries
-   Query optimization
-   Read performance validation
-   Required observability

### Requirement Mapping

-   Admin analytics
-   RBAC
-   Scalability
-   Read latency

### Completion Check

Authorized admin access can retrieve the required analytics without
exposing unauthorized data.

------------------------------------------------------------------------

## Phase 11 --- Observability

### Goal

Complete production observability requirements.

### Work

-   Metrics
-   Structured logs
-   Distributed traces
-   Request correlation
-   Error visibility
-   Performance measurement

### Requirement Mapping

-   Metrics
-   Logs
-   Traces
-   Reliability
-   Performance targets

### Completion Check

A request can be observed through logs/metrics/traces and performance
targets can be measured.

------------------------------------------------------------------------

## Phase 12 --- Reliability, Scalability and DR

### Goal

Finalize architecture requirements around production behavior.

### Work

-   Retry/backoff verification
-   Concurrency verification
-   Caching verification
-   Data partitioning assessment/implementation where justified
-   Transaction/saga review
-   Backup strategy
-   Disaster recovery strategy
-   Failure scenarios

### Requirement Mapping

-   Retry & backoff
-   Data partitioning
-   Caching
-   Concurrency
-   Transactions/sagas
-   Backup/DR
-   99.95% availability target
-   100k daily consultations

### Completion Check

The design documentation explains how the system addresses the required
scale, latency, availability, and failure behavior.

------------------------------------------------------------------------

## Phase 13 --- Automated Tests and CI/CD

### Goal

Make the implementation reproducible and verifiable.

### Work

-   Unit tests
-   Integration tests
-   API tests
-   Critical workflow tests
-   Booking idempotency/concurrency tests
-   Security-related tests
-   CI pipeline
-   Container build
-   Dependency scanning

### Requirement Mapping

-   Automated tests
-   CI pipeline
-   Containerized deployment
-   Dependency scanning
-   Security

### Completion Check

CI validates the repository automatically and blocks
broken/security-risky changes according to the configured checks.

------------------------------------------------------------------------

## Phase 14 --- Final Review and 5-Minute Demo

### Goal

Prepare the interview submission.

### Work

-   Requirement-to-implementation checklist
-   README finalization
-   Architecture document finalization
-   Security checklist finalization
-   Threat model finalization
-   API schema finalization
-   Test evidence
-   CI evidence
-   Observability evidence
-   Demo flow

### Completion Check

Every explicit assignment deliverable has evidence in the repository.

## Phase Dependency

``` mermaid
flowchart TD
    P0[Phase 0: Scope + Docs] --> P1[Phase 1: Foundation]
    P1 --> P2[Phase 2: Database]
    P2 --> P3[Phase 3: Auth + User Lifecycle]
    P3 --> P4[Phase 4: Doctor Availability]
    P4 --> P5[Phase 5: Booking]
    P5 --> P6[Phase 6: Consultation + Prescription]
    P6 --> P7[Phase 7: Search + Filtering]
    P7 --> P8[Phase 8: Payments]
    P8 --> P9[Phase 9: Compliance + Audit]
    P9 --> P10[Phase 10: Admin Analytics]
    P10 --> P11[Phase 11: Observability]
    P11 --> P12[Phase 12: Reliability + DR]
    P12 --> P13[Phase 13: Tests + CI/CD]
    P13 --> P14[Phase 14: Final Submission]
```

## Definition of Done for Every Phase

A phase is not complete until:

-   Its required code/documentation exists.
-   The implementation is consistent with the architecture.
-   Automated validation exists where applicable.
-   The phase's assignment requirements are demonstrably satisfied.
-   No unrelated functionality has been added.
-   The completed phase is explained before proceeding.
