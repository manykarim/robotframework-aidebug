# ADR-004: Enforce Security, Safety, Audit, And Operational Guardrails

- Status: Accepted
- Date: 2026-03-08

## Context

The product can read runtime state, execute keywords, mutate variables, and run snippets in a paused Robot Framework session. Those operations can expose secrets, change runtime behavior, or destabilize the session if performed carelessly.

A design that only focuses on feature completeness would be operationally unsafe.

## Decision

Security, safety, audit, and guardrails are mandatory architecture concerns, not optional polish.

The product will enforce all of the following:

1. explicit operating modes: `off`, `readOnly`, `fullControl`
2. workspace trust and explicit enablement checks
3. paused-only execution for writes and runtime execution
4. redaction and truncation before tool output
5. rate limiting and timeout budgets
6. durable audit records for mutations and execution attempts
7. fail-closed behavior when policy evaluation is unavailable

## Rationale

1. AI-assisted debugging is high leverage and high risk.
2. Prompt text is not a security boundary.
3. Security and audit requirements must survive both bridge and embedded modes.

## Consequences

### Positive

- The product can be operated in regulated or security-conscious environments.
- Failures become diagnosable instead of silent.
- Future external gateways can reuse the same policy domain.

### Negative

- Some operations will be intentionally slower because of validation, logging, or caching.
- User experience must explain policy denials clearly.
- More configuration and test coverage are required.

## Security Baseline

1. No network listeners enabled by default.
2. No secret-bearing payload stored in raw form in audit trails.
3. No hidden execution when the session is running.
4. No silent fallback from read-only to full-control behavior.
