# ADR-002: Add Structured RobotCode Custom DAP Requests

- Status: Accepted
- Date: 2026-03-08

## Context

RobotCode already supports standard DAP requests such as `stackTrace`, `scopes`, `variables`, `evaluate`, `setVariable`, and stepping commands.

Those requests are enough for low-level debugger interaction, but they are not enough for agent-safe behavior because:

- `evaluate` is too ambiguous for structured keyword execution,
- multiple round trips are required for a compact state summary,
- the agent needs stable response schemas rather than free-form console semantics.

The debug launcher forwards unknown requests to the debug server. That makes additive custom requests feasible without redesigning the launcher.

## Decision

Introduce these RobotCode-specific DAP requests:

1. `robot/getExecutionState`
2. `robot/getVariablesSnapshot`
3. `robot/executeKeyword`
4. `robot/executeSnippet`

These requests are additive and will be implemented in the debug server.

## Request Contracts

### `robot/getExecutionState`

Use when the agent needs a compact answer to "what is happening now?"

Example request:

```json
{
  "includeStack": true,
  "includeScopes": false,
  "maxLogLines": 20
}
```

Example response:

```json
{
  "state": "paused",
  "threadId": 1,
  "stopReason": "breakpoint",
  "topFrame": {
    "id": 41,
    "name": "Validate checkout",
    "source": "tests/checkout.robot",
    "line": 28,
    "column": 1
  },
  "currentItem": {
    "type": "keyword",
    "id": "kw-28",
    "name": "Verify totals",
    "source": "tests/checkout.robot",
    "lineno": 28
  },
  "recentEvents": []
}
```

### `robot/getVariablesSnapshot`

Use when the agent needs a bounded, redacted snapshot instead of navigating the variable tree one node at a time.

### `robot/executeKeyword`

Use only for a single keyword call with explicit arguments and optional assignments.

### `robot/executeSnippet`

Use only for multi-line Robot body execution. The implementation must wrap the snippet in a synthetic suite/test body before parsing because raw body fragments are not executable models on their own in Robot Framework 7.4.2.

## Rationale

1. Explicit request shapes are easier to validate, log, and rate-limit.
2. The custom requests align better with the agent use cases than raw DAP primitives do.
3. The request family leaves standard DAP untouched and backward compatible.

## Consequences

### Positive

- Cleaner extension code.
- Safer server-side validation.
- Easier test coverage for input and output schemas.

### Negative

- The debug server grows a RobotCode-specific surface area.
- The team must maintain versioned request contracts.
- Snippet execution must carefully preserve Robot semantics.
