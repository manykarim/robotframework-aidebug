# Non-Functional Requirements

## Performance

1. Tool responses must feel interactive.
2. Cached state reads should stay comfortably under human-perceived delay thresholds.
3. Snippet parsing must use bounded caching because wrapped Robot parsing is a hot path.

## Stability

1. No event-loop blocking on audit or cache writes.
2. All external calls must have explicit timeout budgets.
3. Session degradation must be detectable and visible.

## Reliability

1. Reads may be retried once after transient transport failures.
2. Writes and runtime execution must be at-most-once unless the user explicitly retries.
3. Version mismatch must fail with a precise capability reason.

## Security

1. Least privilege by default.
2. Redaction and truncation before tool output, logging, and telemetry.
3. No network listeners by default.
4. Workspace trust and explicit feature enablement required.

## Privacy

1. Secrets must be redacted in tool output and audit trails.
2. Stored logs and metrics must avoid raw user data where possible.
3. Diagnostic bundles must be opt-in and sanitized.

## Operability

1. Structured logs with correlation ids.
2. Metrics for latency, timeout, denial, retry, and transport failure.
3. Clear health status surfaced in the extension UI and logs.

## Testability

1. Every command has a contract-testable boundary.
2. Both bridge and embedded transports share the same domain-level test vectors.
3. E2E tests must exercise full user journeys, not isolated request mocks only.
