# Chat Agents Compatibility And Hardening

## Purpose

This document specifies the `M7` hardening phase for chat-agent integration.

It focuses on:

- compatibility boundaries
- performance and reliability gates
- security and abuse resistance
- recovery behavior

## Compatibility Boundaries

The product has distinct compatibility surfaces:

1. VS Code extension host and native LM tool APIs
2. chat participant APIs
3. MCP framework/runtime APIs
4. RobotCode bridge behavior for live debug sessions
5. Python runtime and Robot Framework versions

Each boundary must be managed explicitly.

## Compatibility Matrix Dimensions

Track at minimum:

- VS Code version range
- native agent feature availability
- RobotCode version range for bridge mode
- Python version range
- Robot Framework version range
- MCP framework version range
- tested MCP clients

## Version Policy

1. Declare supported ranges per surface.
2. Fail fast with actionable diagnostics for unsupported combinations.
3. Prefer additive compatibility layers over semantic forks.
4. Keep framework adapters thin and isolated.

## Performance Budgets

### Latency Budgets

Target end-to-end median budgets:

- read-only LM tool invocation: `< 500 ms` excluding host model latency
- mutating LM tool invocation: `< 1500 ms` excluding user confirmation delay
- MCP stdio read-only invocation: `< 700 ms`
- MCP stdio mutating invocation: `< 1700 ms`

These are operational budgets, not raw helper benchmarks.

### Payload Budgets

Use the canonical token-budget spec as the default gate.

Additional hardening rule:

- no default agent surface should emit unbounded stack traces, variable dumps, or completion lists

## Reliability Rules

1. Session loss during invocation must produce deterministic failure envelopes.
2. Queued mutating actions must be cancelled when the target session terminates.
3. Audit-required actions must either persist audit metadata or raise explicit diagnostics about audit degradation.
4. Host adapter crashes must not corrupt shared-core state across subsequent invocations.

## Security Rules

1. Redaction is mandatory for all agent-visible outputs.
2. Host- or runtime-originated text must not be treated as trusted instructions.
3. Mutating actions remain confirmation-gated regardless of client pressure.
4. HTTP MCP exposure requires explicit local authorization.
5. Configuration that weakens safety must be visible and deliberate.

## Abuse And Misuse Cases

The hardening suite must cover at least:

- oversized variable enumeration requests
- repeated mutation attempts in `readOnly`
- prompt-injection-like runtime output
- malformed MCP request bodies
- stale session ids
- repeated retries on non-idempotent actions
- HTTP requests without valid auth when enabled

## Diagnostics Rules

Every compatibility or hardening failure should aim to answer:

- which surface failed
- which version or boundary caused it
- whether retry is reasonable
- what the next recovery step is

## Recovery Rules

1. Adapter-level failures should degrade to canonical failures, not crashes, where possible.
2. Session caches must invalidate on termination or major state change.
3. Tool visibility should refresh when control mode, trust, or session topology changes.
4. MCP server startup failures must not block unrelated extension capabilities.

## Test Requirements

### Compatibility

- host version gating
- RobotCode bridge variance fixtures
- MCP framework compatibility fixtures

### Performance

- payload-budget regression tests
- latency regression tests under representative fixture loads
- cancellation timing tests

### Security

- redaction regression tests
- prompt-injection resistance tests
- malformed input tests
- HTTP auth tests

### Reliability

- session termination during invocation
- host restart behavior
- MCP server restart behavior
- transport adapter fallback behavior

## Release Gate

`M7` is complete only when:

1. compatibility matrix is documented and validated
2. performance budgets hold under regression tests
3. security and abuse tests pass
4. recovery behavior is deterministic in fixture and integration tests
