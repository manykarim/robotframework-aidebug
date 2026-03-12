# Chat Agents Tool Contracts

## Purpose

This document freezes the canonical tool catalog for chat-agent integration in `robotframework-aidebug`.

It is the contract source for:

- VS Code `languageModelTools`
- chat participant orchestration
- MCP tools
- shared application-layer invocation planning

## Versioning

- Contract version: `1.0.0`
- Compatibility rule:
  - additive optional fields are minor-compatible
  - removing fields, changing semantics, or changing failure meanings is major-breaking
- Each invocation surface must expose the contract version through `get_capabilities`

## Global Rules

1. Tool ids are canonical and transport-independent.
2. Tool ids use `snake_case`.
3. Inputs are declarative and JSON-serializable.
4. Output payloads must be wrapped in the canonical result envelope.
5. Mutating tools must be policy-gated and auditable.
6. Read-only tools must not cause runtime side effects.
7. Surfaces may hide unsupported tools, but must not redefine semantics.

## Tool Catalog

| Tool Id | Class | Mutates Runtime | Requires Paused Session | Primary Surfaces |
| --- | --- | --- | --- | --- |
| `get_state` | inspection | no | no | LM tools, participant, MCP |
| `get_variables_snapshot` | inspection | no | no | LM tools, participant, MCP |
| `get_runtime_context` | inspection | no | no | LM tools, participant, MCP |
| `get_capabilities` | inspection | no | no | LM tools, participant, MCP |
| `get_audit_log` | inspection | no | no | LM tools, participant, MCP |
| `control_execution` | control | yes | no | LM tools, participant, MCP |
| `execute_keyword` | execution | yes | yes | LM tools, participant, MCP |
| `execute_snippet` | execution | yes | yes | LM tools, participant, MCP |
| `set_variable` | mutation | yes | yes | LM tools, participant, MCP |

## Common Input Fields

The following fields may be accepted by multiple tools.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `session_id` | string | no | explicit target session; if omitted, the active session resolver applies |
| `surface` | string | no | host-origin hint such as `lm_tool`, `chat_participant`, or `mcp` |
| `request_id` | string | no | caller-generated id used for diagnostics and correlation |
| `max_items` | integer | no | upper bound for collection sizes |
| `max_bytes` | integer | no | caller preference for bounded payload size |
| `include_stack` | boolean | no | include stack information where relevant |
| `include_scopes` | boolean | no | include scope references where relevant |
| `frame_id` | integer | no | target frame for frame-sensitive operations |

## Tool Definitions

## `get_state`

Purpose:
Return the current runtime state, including stop status, active frame, and optionally stack/scopes metadata.

Input:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `session_id` | string | no | optional explicit target |
| `include_stack` | boolean | no | default `true` for native tools, `false` for token-constrained contexts |
| `include_scopes` | boolean | no | only meaningful if stack/frame data exists |
| `max_log_lines` | integer | no | cap recent log lines |

Payload schema:

```json
{
  "session": {
    "id": "string",
    "transport": "bridge|embedded|fallback",
    "debug_type": "robotcode|robotframework-aidebug|none"
  },
  "runtime": {
    "state": "stopped|running|terminated|idle",
    "stop_reason": "breakpoint|step|pause|exception|entry|none",
    "thread_id": 1,
    "frame_id": 101
  },
  "stack": [],
  "scopes": [],
  "recent_logs": []
}
```

## `get_variables_snapshot`

Purpose:
Return a bounded snapshot of visible variables across one or more scopes.

Input:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `session_id` | string | no | optional explicit target |
| `frame_id` | integer | no | defaults to active frame if available |
| `scopes` | array[string] | no | allowed: `local`, `test`, `suite`, `global`, `arguments` |
| `max_items` | integer | no | default cap from token budget class |
| `include_values` | boolean | no | default `true`; host may request names-only mode |

Payload schema:

```json
{
  "frame_id": 101,
  "scopes": [
    {
      "name": "local",
      "truncated": false,
      "variables": [
        {
          "name": "${VALUE}",
          "value": "redacted-or-plain-string",
          "type": "scalar|string|list|dict|unknown",
          "reference": 0,
          "redacted": false
        }
      ]
    }
  ]
}
```

## `get_runtime_context`

Purpose:
Return bounded context useful for planning or grounding an agent action.

Input:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `session_id` | string | no | optional explicit target |
| `frame_id` | integer | no | optional target frame |
| `include_completions` | boolean | no | default `true` |
| `include_namespace_summary` | boolean | no | default `true` |
| `max_items` | integer | no | completion and symbol cap |

Payload schema:

```json
{
  "frame_id": 101,
  "stopped_keyword": "Keyword Name",
  "namespace_summary": {
    "libraries": [],
    "resources": [],
    "variables": []
  },
  "completions": [
    {
      "label": "Log",
      "kind": "keyword|variable|library|resource",
      "detail": "BuiltIn"
    }
  ]
}
```

## `get_capabilities`

Purpose:
Return capability information for the current host/runtime pairing.

Input:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `session_id` | string | no | optional explicit target |

Payload schema:

```json
{
  "contract_version": "1.0.0",
  "surface": {
    "type": "lm_tool|chat_participant|mcp",
    "host": "vscode|cline|other"
  },
  "runtime": {
    "transport": "bridge|embedded|fallback",
    "can_execute_keyword": true,
    "can_execute_snippet": true,
    "can_set_variable": true,
    "can_control_execution": true,
    "requires_confirmation": ["execute_keyword", "execute_snippet", "set_variable", "control_execution"]
  }
}
```

## `get_audit_log`

Purpose:
Return a bounded, redacted view of recent auditable actions.

Input:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `session_id` | string | no | optional explicit target |
| `limit` | integer | no | default from token budget class |
| `after` | string | no | cursor or timestamp for incremental views |

Payload schema:

```json
{
  "events": [
    {
      "timestamp": "2026-03-09T12:00:00Z",
      "tool": "set_variable",
      "status": "allowed|denied|failed|completed",
      "policy_mode": "readOnly|fullControl",
      "summary": "Set ${ORDER_ID} in test scope",
      "correlation_id": "string"
    }
  ],
  "next_cursor": "string-or-null"
}
```

## `control_execution`

Purpose:
Control the live debugger execution state.

Input:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `session_id` | string | no | optional explicit target |
| `action` | string | yes | `pause`, `continue`, `step_in`, `step_out`, `next` |
| `thread_id` | integer | no | optional thread target |

Payload schema:

```json
{
  "action": "next",
  "previous_state": "stopped",
  "new_state": "running",
  "accepted": true
}
```

## `execute_keyword`

Purpose:
Execute a single Robot Framework keyword in the paused runtime context.

Input:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `session_id` | string | no | optional explicit target |
| `frame_id` | integer | no | defaults to active frame |
| `keyword` | string | yes | keyword name |
| `args` | array[string] | no | positional args only in v1 |
| `assign` | array[string] | no | optional assignment targets |
| `timeout_ms` | integer | no | bounded by policy |

Payload schema:

```json
{
  "keyword": "Log",
  "args": ["hello"],
  "assign": [],
  "status": "passed|failed",
  "return_value": null,
  "output": "bounded-text",
  "error": null
}
```

## `execute_snippet`

Purpose:
Execute a bounded multi-line Robot Framework snippet in the paused runtime context.

Input:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `session_id` | string | no | optional explicit target |
| `frame_id` | integer | no | defaults to active frame |
| `snippet` | string | yes | multi-line Robot snippet |
| `timeout_ms` | integer | no | bounded by policy |
| `purpose` | string | no | short caller justification for audit |

Payload schema:

```json
{
  "status": "passed|failed",
  "output": "bounded-text",
  "assigned_variables": [],
  "error": null
}
```

## `set_variable`

Purpose:
Set a variable in the chosen runtime scope.

Input:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `session_id` | string | no | optional explicit target |
| `frame_id` | integer | no | defaults to active frame if needed |
| `name` | string | yes | canonical Robot variable name |
| `value` | string | yes | scalar string value in v1 |
| `scope` | string | yes | `local`, `test`, `suite`, `global` |

Payload schema:

```json
{
  "name": "${ORDER_ID}",
  "scope": "test",
  "changed": true,
  "previous_value": "redacted-or-bounded-string",
  "new_value": "redacted-or-bounded-string"
}
```

## Host Visibility Rules

| Tool Id | LM Tools | Chat Participant | MCP |
| --- | --- | --- | --- |
| `get_state` | yes | yes | yes |
| `get_variables_snapshot` | yes | yes | yes |
| `get_runtime_context` | yes | yes | yes |
| `get_capabilities` | yes | yes | yes |
| `get_audit_log` | yes | yes | yes |
| `control_execution` | yes | yes | yes |
| `execute_keyword` | yes | yes | yes |
| `execute_snippet` | yes | yes | yes |
| `set_variable` | yes | yes | yes |

Host notes:

1. A surface may suppress tools when trust or policy does not allow them.
2. A host may expose orchestration-only UX for some tools, but must still call the same canonical contract.
3. Experimental tools must not be exposed by default on any surface.

## Non-Goals For Contract Version 1

- binary payloads
- arbitrary object mutation inputs
- user-defined dynamic tool schemas
- hidden host-only tool ids
- separate semantics for Copilot versus MCP clients
