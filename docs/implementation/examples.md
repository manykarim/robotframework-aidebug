# Examples And User Journeys

## Example 1: Read-Only Bridge Session Diagnosis

### Preconditions

- VS Code has an active paused `robotcode` debug session.
- `robotframework-aidebug` is enabled in `readOnly` mode.

### Tool Flow

1. `ResolveSession`
2. `ProbeCapabilities`
3. `GetExecutionState`
4. `GetVariablesSnapshot` for local scope

### Expected Result

The user gets a concise explanation of the current frame, stop reason, relevant variables, and suggested next diagnostic actions.

## Example 2: Full-Control Keyword Execution

### Preconditions

- session is paused
- `fullControl` mode is enabled
- runtime execution capability is supported

### Normalized Command

```json
{
  "type": "ExecuteKeyword",
  "keyword": "Log Variables",
  "args": [],
  "assign": [],
  "timeoutSec": 5,
  "captureLog": true
}
```

### Expected Result

The user receives PASS or FAIL, bounded logs, and the updated runtime context summary.

## Example 3: Multi-Line Snippet Execution

### User Intent

Run a conditional recovery snippet while paused.

### Original Snippet

```robotframework
IF    $status == 'FAILED'
    Log    Investigating failure
END
```

### Wrapped Envelope

```robotframework
*** Test Cases ***
AgentSnippet
    IF    $status == 'FAILED'
        Log    Investigating failure
    END
```

### Why The Wrapper Exists

A fresh `uv run` experiment on 2026-03-08 confirmed that the raw body parses into `ImplicitCommentSection`, while the wrapped version produces `TestCaseSection` and a runnable test body.

## Example 4: Static Namespace Fallback

### Preconditions

- no paused live session exists
- source files are open in the workspace

### Behavior

The agent answers from static Robot source analysis and explicitly labels the answer as editor-derived instead of runtime-derived.

## Example 5: Full E2E User Journey To Validate

1. open a sample Robot project
2. start debugging
3. hit a breakpoint in a failing test
4. inspect current state
5. inspect scoped variables
6. run a diagnostic keyword
7. change a variable
8. execute a short recovery snippet
9. step over
10. resume execution
11. confirm test result and audit trail

This journey should exist as an automated end-to-end test in both supported modes where feasible.
