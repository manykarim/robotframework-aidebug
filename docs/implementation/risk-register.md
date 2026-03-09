# Risk Register

## R-01: RobotCode Version Drift Breaks Bridge Behavior

Likelihood: Medium
Impact: High

Mitigations:

1. capability probes instead of static assumptions
2. explicit supported-version matrix
3. contract tests against pinned RobotCode versions
4. degrade gracefully with actionable unsupported reasons

## R-02: Event Synchronization Causes Session Stalls

Likelihood: Medium
Impact: High

Mitigations:

1. non-blocking event handling
2. bounded acknowledgement timeout budgets
3. dedicated tests around synced custom events and `robot/sync`
4. health-state transitions when acknowledgements fail

## R-03: Runtime Execution Exposes Secrets Or Unsafe Side Effects

Likelihood: High
Impact: High

Mitigations:

1. `readOnly` default
2. explicit full-control enablement
3. redaction, truncation, and audit
4. paused-only execution
5. allowlist or stronger validation for future higher-risk operations if required

## R-04: `evaluate` String Semantics Lead To Ambiguous Behavior

Likelihood: Medium
Impact: Medium

Mitigations:

1. normalize user intent into typed domain commands first
2. centralize string construction
3. prefer structured `robot/*` requests when available
4. maintain parser and expression experiments in CI

## R-05: Embedded Mode Becomes A Fork Of Upstream Runtime Logic

Likelihood: Medium
Impact: High

Mitigations:

1. reuse upstream Python packages where practical
2. isolate compatibility adapters
3. avoid premature embedded-mode implementation before bridge-mode success

## R-06: Observability Leaks Sensitive Data

Likelihood: Medium
Impact: High

Mitigations:

1. redact before persistence and telemetry
2. payload-size limits
3. privacy review of metrics and logs
4. no raw command logging for secret-bearing inputs

## R-07: Performance Regressions Are Hidden By Fast Local Helpers

Likelihood: Medium
Impact: Medium

Mitigations:

1. benchmark end-to-end transport paths, not just Python helpers
2. treat cache misses and cold-start paths separately
3. monitor p95 and max latency, not averages only
