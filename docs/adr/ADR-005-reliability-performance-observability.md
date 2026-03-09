# ADR-005: Define Reliability, Performance, And Observability Budgets

- Status: Accepted
- Date: 2026-03-08

## Context

The product sits on the interactive debugging path. Poor latency, event-loop stalls, or opaque failures would make the live experience unusable even if the feature set is correct.

## Decision

Adopt explicit service-level targets for interactive debugging.

## Budgets

### Performance Targets

- state read: p95 under `150 ms`
- variable snapshot: p95 under `250 ms`
- single keyword execution dispatch overhead excluding keyword runtime: p95 under `200 ms`
- cached snippet parsing overhead excluding snippet runtime: p95 under `250 ms`
- session capability detection: under `50 ms`

### Reliability Targets

- no deadlock introduced by event handling or `robot/sync`
- read operations safe to retry once after transient bridge failures
- write and execute operations never auto-retried without explicit user intent
- all timeouts surfaced with action, scope, and session context

### Observability Targets

- correlation id per tool invocation
- transport, policy, and execution outcome metrics
- structured logs with bounded payload sizes
- redaction applied before persistence and telemetry emission

## Rationale

1. Interactive debugger tooling needs hard limits.
2. Reliability cannot be inferred from unit tests alone.
3. Performance must be measured at the transport boundary, not only in isolated Python helpers.

## Consequences

- Benchmarks become part of acceptance.
- E2E tests must include failure injection and timeouts.
- The system needs small caches, bounded queues, and non-blocking event handling.
