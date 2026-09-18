# Phase 11 — Observability

## Implemented

- HTTP request correlation with `x-request-id`.
- W3C Trace Context-compatible `traceparent` propagation/fallback.
- Structured JSON request completion logs with request ID, trace context, method, path, status, and duration.
- Structured 5xx error logging without credentials or secrets.
- In-process HTTP request counters, error counters, status counters, and latency histogram.
- Prometheus-compatible `GET /api/metrics` endpoint.
- Existing `/api/health` and `/api/ready` endpoints preserved.
- Observability smoke test.

## Security

The observability layer does not log request bodies, authorization headers, passwords, MFA secrets, access tokens, or payment secrets.

## Tracing approach

The service propagates W3C Trace Context so an upstream gateway or OpenTelemetry-compatible collector can correlate requests. The generated trace context is suitable as the root request context when no upstream trace exists. This phase intentionally avoids introducing a separate tracing backend; deployment can connect the trace context to the organization's OpenTelemetry collector.

## Metrics

`GET /api/metrics` returns Prometheus text format. Metrics are process-local and reset on application restart; a production deployment should scrape each instance and aggregate at the monitoring layer.
