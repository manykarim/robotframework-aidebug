# Worked Examples

## Example 1: Read Current State

### Tool Invocation

Tool name: `robot-debug-get_state`

Example summary returned to the agent:

```text
Session is paused at tests/checkout.robot:28 in keyword "Verify totals".
Stop reason: breakpoint.
Active test: Validate checkout.
Recent Robot events: 3.
```

### Underlying Request

```json
{
  "command": "robot/getExecutionState",
  "arguments": {
    "includeStack": true,
    "maxLogLines": 10
  }
}
```

## Example 2: Get A Safe Variable Snapshot

### Tool Invocation

Tool name: `robot-debug-get_variables`

Request example:

```json
{
  "frameId": 41,
  "scopes": ["local", "test"],
  "maxItems": 10,
  "redactPatterns": ["PASSWORD", "TOKEN"]
}
```

Response example:

```json
{
  "variables": {
    "local": {
      "${status}": "FAILED",
      "${username}": "alice",
      "${api_token}": "<redacted>"
    },
    "test": {
      "${order_id}": "A-1042"
    }
  },
  "truncated": false
}
```

## Example 3: Execute A Diagnostic Keyword

### Tool Invocation

Tool name: `robot-debug-execute_keyword`

Request example:

```json
{
  "keyword": "Log Variables",
  "args": [],
  "assign": [],
  "frameId": 41,
  "timeoutSec": 5,
  "captureLog": true
}
```

Response example:

```json
{
  "status": "PASS",
  "returnValueRepr": "None",
  "assigned": {},
  "logRef": 12
}
```

## Example 4: Execute A Multi-Line Snippet

### Why Wrapping Is Required

The experiment set showed that this body alone:

```robotframework
IF    True
    Log    inside
END
```

is not parsed as executable body content by `get_model()` when supplied alone.

The implementation therefore has to synthesize an envelope like this before parsing:

```robotframework
*** Test Cases ***
Agent Probe
    IF    True
        Log    inside
    END
```

### Request Example

```json
{
  "snippet": "IF    $status == 'FAILED'\n    Log    Investigating\nEND",
  "frameId": 41,
  "timeoutSec": 5
}
```

### Response Example

```json
{
  "status": "OK",
  "resultRepr": "None"
}
```

## Example 5: Policy Rejection

Response example when the session is running:

```json
{
  "status": "ERROR",
  "error": "Snippet execution is only allowed while the debug session is paused."
}
```

## Example 6: Audit Entry

```json
{
  "timestamp": "2026-03-08T10:42:15Z",
  "sessionId": "robotcode:checkout",
  "toolName": "robot-debug-execute_keyword",
  "commandType": "ExecuteKeyword",
  "sanitizedArguments": {
    "keyword": "Log Variables",
    "args": []
  },
  "result": "PASS",
  "durationMs": 84
}
```
