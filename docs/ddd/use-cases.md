# Use Cases

## UC-01: Inspect Current Failure State

### Trigger

The agent is asked why the current Robot test failed or where execution is paused.

### Primary Flow

1. Resolve the active RobotCode debug session.
2. Validate feature enablement and workspace trust.
3. Invoke `robot/getExecutionState`.
4. Optionally request `stackTrace`, `scopes`, or `robot/getVariablesSnapshot`.
5. Return a compact summary to the agent.

### Success Result

The agent receives a bounded snapshot of state without mutating execution.

## UC-02: Inspect Variables Safely

### Trigger

The agent needs current variable values to diagnose a failure.

### Primary Flow

1. Resolve frame and scope.
2. Prefer `robot/getVariablesSnapshot` for compact inspection.
3. Fall back to standard `variables` traversal for deep trees.
4. Apply redaction and truncation before tool output.

### Business Rule

Secrets are summarized or redacted unless the user explicitly allows broader disclosure in policy.

## UC-03: Set A Variable During A Paused Session

### Trigger

The agent proposes a one-off mutation to test a hypothesis.

### Primary Flow

1. Confirm `mode = fullControl`.
2. Confirm the session is paused.
3. Resolve scope or variable reference.
4. Send `setVariable` or a future higher-level scoped mutation request.
5. Log the action.
6. Return the post-mutation value summary.

### Failure Modes

- no active session,
- running instead of paused,
- variable not found,
- scope mismatch,
- policy rejection.

## UC-04: Execute A Diagnostic Keyword

### Trigger

The agent wants to call a known Robot keyword such as `Log Variables` or a domain-specific diagnostic helper.

### Primary Flow

1. Confirm `mode = fullControl` and paused state.
2. Build a `KeywordInvocation` value object.
3. Send `robot/executeKeyword`.
4. Capture status, return value, and bounded logs.
5. Emit an audit entry.

### Invariant

Execution happens through a structured request, not arbitrary free-form `evaluate` text.

## UC-05: Execute A Multi-Line Snippet

### Trigger

The agent needs a small test-body sequence such as an `IF`, `FOR`, or several keyword calls.

### Primary Flow

1. Confirm `mode = fullControl` and paused state.
2. Wrap the body text in a `SnippetEnvelope`.
3. Parse with Robot Framework APIs.
4. Execute in the current debug context.
5. Return a structured success or error response.

### Verified Constraint

The snippet envelope is mandatory because body fragments alone do not parse into executable Robot body nodes in Robot Framework 7.4.2.
