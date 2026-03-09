# Use Cases

## UC-01: Explain Why Execution Is Paused

### Trigger

The user asks the agent what is happening in the active Robot Framework debug session.

### Main Flow

1. Resolve the active `AgentDebugSession`.
2. Probe capabilities if needed.
3. Read the execution snapshot.
4. Read the top stack frame and bounded recent output if not already cached.
5. Return a concise explanation with source location, stop reason, and next allowed actions.

### Success Outcome

The user receives an accurate explanation without mutating runtime state.

## UC-02: Inspect Runtime Variables Safely

### Trigger

The user asks for the current values of one or more variables.

### Main Flow

1. Resolve frame and scope.
2. Prefer a bounded snapshot over deep tree traversal.
3. Apply policy-based redaction and truncation.
4. Return a value summary and note truncation if applicable.

### Failure Cases

- no paused session
- scope unavailable for frame
- payload exceeds configured budget
- policy denial for sensitive material

## UC-03: Execute A Diagnostic Keyword During A Pause

### Trigger

The user asks the agent to run a Robot keyword while debugging.

### Main Flow

1. Require `fullControl` mode.
2. Confirm the session is paused.
3. Normalize the request into `KeywordInvocation`.
4. Dispatch through transport-specific execution.
5. Capture result, bounded logs, and post-execution state.
6. Emit an audit entry.

### Rule

Execution must never begin from free-form prompt text without normalization and policy evaluation.

## UC-04: Execute A Multi-Line Recovery Snippet

### Trigger

The user asks the agent to run a small Robot body fragment such as an `IF` block or sequence of keywords.

### Main Flow

1. Require `fullControl` mode.
2. Wrap the snippet in a `SnippetEnvelope`.
3. Validate the snippet parses cleanly.
4. Dispatch it into the paused runtime context.
5. Return structured success, failure, or parse diagnostics.

### Verified Constraint

The snippet envelope is mandatory because raw body fragments parse into implicit comments instead of executable bodies.

## UC-05: Switch From Bridge To Embedded Mode

### Trigger

Bridge mode is unavailable, degraded, or unsupported for the required feature set.

### Main Flow

1. Detect the reason bridge mode is unsuitable.
2. Surface a precise capability explanation.
3. Offer or select embedded mode if installed and configured.
4. Re-run capability probing.
5. Continue using the same tool contracts.

### Success Outcome

The user sees continuity of behavior despite a transport change.

## UC-06: Provide Namespace-Aware Suggestions

### Trigger

The user asks what keyword, variable, or symbol is relevant at the current location.

### Main Flow

1. Use runtime completions when a paused live session exists.
2. Use static namespace intelligence when no paused runtime is available.
3. Clearly label whether the answer came from runtime or source analysis.

### Design Rule

Do not conflate runtime truth with static analysis. Both are useful, but they are not equivalent.
