# Phase 12 — Reliability, Scalability & Disaster Recovery

## Scope

This phase implements the reliability controls required by the assignment's architecture tasks: retry/backoff, caching and concurrency strategy, data partitioning strategy, transaction safety, and backup/disaster recovery guidance.

## Implemented

- PostgreSQL connection-pool limits and timeouts are configurable through environment variables.
- PostgreSQL statement timeout prevents indefinitely running statements from consuming resources.
- Pool-level database errors are captured through structured logging without logging credentials or query payloads.
- `/api/ready` returns `503` when PostgreSQL is unavailable, so traffic management can distinguish an unready instance from a healthy one.
- Added a bounded exponential-backoff utility for transient infrastructure operations.
- Retry policy is explicit: callers must provide `shouldRetry`; non-idempotent business writes must not be blindly retried.
- Added a deterministic reliability smoke test for retry limits and backoff behavior.
- Existing booking and payment transaction locks/idempotency remain the primary concurrency controls.

## Retry & Backoff Policy

Use retries only for operations that are safe to retry or are protected by idempotency. Use bounded exponential backoff and stop after a small finite number of attempts. Do not retry validation failures, authorization failures, unique/business conflicts, or other permanent errors.

## Caching Strategy

The current implementation does not add Redis because the assignment marks Redis optional. Read-heavy data such as doctor search/availability can be cached at deployment time if profiling demonstrates a need. Cache entries must have short TTLs and be invalidated or bypassed after availability mutations. Booking/payment decisions must always use PostgreSQL as the source of truth.

## Concurrency & Transactions

Booking locks the availability slot row inside a transaction and uses idempotency protection. Payment creation locks the consultation row and uses idempotency protection. These mechanisms prevent double booking and duplicate payment creation under concurrent requests. Cross-system workflows should use transactional boundaries plus an outbox/saga pattern if a future external side effect is introduced; no external broker is required by this assignment phase.

## Partitioning Strategy

At the assignment scale, `audit_logs` is the first natural high-growth candidate for time-based monthly partitioning because every security/workflow event is append-only and queried by creation time. `consultations` can be evaluated for time-based partitioning if volume or retention requirements justify it. Partitioning should be introduced with a migration plan, backfill, indexes on each partition, and retention controls rather than changing the current eight-table domain model prematurely.

## Backup & Disaster Recovery

PostgreSQL backups should use automated daily full backups plus WAL archiving/point-in-time recovery in a production deployment. Backups must be encrypted, access-controlled, monitored, and periodically restore-tested.

Recommended targets for this assignment design:

- RPO: <= 15 minutes using WAL-based recovery.
- RTO: <= 60 minutes for a regional/database failure scenario.
- Retain multiple backup generations according to organizational policy.
- Store backups separately from the primary database environment.
- Test restoration regularly and record restore duration and validation results.

Example operational commands (run against a controlled backup environment):

```text
pg_dump --format=custom --file=amrutam-backup.dump "$DATABASE_URL"
pg_restore --list amrutam-backup.dump
```

A restore should be performed into a fresh PostgreSQL instance before production recovery. Never test destructive restore procedures against the live database.

## Scalability Notes

- Stateless API instances can be horizontally scaled behind a load balancer.
- PostgreSQL remains the source of truth for booking/payment concurrency.
- Existing indexes support the primary search, booking, consultation, payment, and audit access patterns.
- Connection-pool limits must be sized against the PostgreSQL server's connection budget across all API replicas.
- Heavy asynchronous work can be moved to workers in a later deployment layer; no new queue is introduced here because it is not required by the assignment's current core workflows.
