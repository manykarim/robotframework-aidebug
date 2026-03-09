# ADR-003: Use Existing DAP Semantics First And Add Structured Requests Later

- Status: Accepted
- Date: 2026-03-08

## Context

RobotCode already exposes the standard DAP requests needed for most live debug features:

- `stackTrace`
- `scopes`
- `variables`
- `evaluate`
- `setVariable`
- `completions`
- execution control requests

Its debugger also already supports paused-context Robot snippet execution and keyword execution through `evaluate` in REPL-style semantics.

Structured custom requests such as `robot/getExecutionState` or `robot/executeKeyword` would still improve schema clarity, auditability, and client simplicity, but they are not required to deliver the first live bridge.

## Decision

1. Use existing DAP semantics for `Bridge Mode` v1.
2. Build the client around stable wrappers and domain contracts, not raw string handling in the tool layer.
3. Treat structured `robot/*` requests as a second-phase enhancement for `Bridge Mode` and a first-class surface for `Embedded Mode`.

## Rationale

1. Existing DAP coverage is enough to ship useful live features quickly.
2. The tool layer should translate domain commands into DAP requests without exposing DAP details to the agent.
3. Structured requests remain desirable, but they should not block delivery.

## Consequences

### Positive

- Faster path to live integration.
- Reduced upstream dependency for the first version.
- A clean migration path toward stronger request schemas.

### Negative

- `evaluate` remains stringly typed in the early bridge implementation.
- The client must enforce stricter validation and policy rules around snippet and keyword execution.
- Some compact snapshots will require multiple DAP round trips until custom requests exist.

## Design Constraint

The client must never hand free-form agent text directly to DAP. It must always normalize the operation into one of the supported domain commands first.
