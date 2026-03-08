# ADR-003: Enforce Safety, Redaction, And Auditing By Default

- Status: Accepted
- Date: 2026-03-08

## Context

Agent-driven debugging crosses a higher risk boundary than static code assistance:

- variables and logs may contain secrets,
- keyword execution may trigger real side effects,
- variable mutation can alter test outcomes,
- tool outputs may be forwarded to local or remote models depending on the host configuration.

The system therefore needs explicit control over what the agent can do, when it can do it, and how actions are recorded.

## Decision

The feature will be opt-in and conservative by default.

### Default behavior

- `robotcode.agentDebug.enabled = false`
- `robotcode.agentDebug.mode = off | readOnly | fullControl`
- workspace trust required for anything beyond read-only
- execution and mutation allowed only while paused
- redaction and truncation applied before tool output is returned
- every write or execution action logged to an audit sink
- per-session rate limits applied to execution and mutation requests

## Policy Rules

1. Read-only tools may inspect state, stack frames, scopes, variables, and recent events.
2. Write tools may set variables only when a concrete scope or variable reference is resolved.
3. Execute tools may run only when the session is paused or in a dedicated call-keyword state.
4. The optional HTTP or MCP bridge is disabled by default.

## Rationale

1. Safety must be part of the architecture, not a later hardening phase.
2. Redaction at the tool boundary prevents accidental oversharing into prompts.
3. Auditing is required because agent behavior is indirect and can otherwise be hard to reconstruct.

## Consequences

### Positive

- Safer preview rollout.
- Clear enterprise story for least privilege.
- Easier incident analysis for unexpected agent actions.

### Negative

- More settings and policy code.
- Some flows will feel slower because of confirmation and limits.
- Read-only and full-control modes require separate test coverage.
