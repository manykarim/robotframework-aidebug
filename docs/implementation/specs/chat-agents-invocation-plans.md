# Chat Agents Invocation Planner Contract

## Purpose

This document defines the normalized invocation plan used between host surfaces and the shared application layer.

The goal is to ensure that:

- VS Code LM tools
- chat participant flows
- MCP tool invocations

all produce the same execution intent for the same requested action.

## Planner Responsibilities

1. resolve the canonical tool id
2. validate and normalize inputs
3. classify the action by policy class
4. resolve target session strategy
5. determine whether confirmation is required
6. attach budget and shaping hints
7. attach correlation and audit metadata

## Invocation Plan Schema

```json
{
  "tool": "execute_keyword",
  "contract_version": "1.0.0",
  "surface": {
    "type": "lm_tool|chat_participant|mcp",
    "host": "vscode|cline|other",
    "client_version": "optional-string"
  },
  "request": {
    "request_id": "optional-caller-id",
    "received_at": "2026-03-09T12:00:00Z"
  },
  "target": {
    "session_selector": "active|explicit|none",
    "session_id": "optional-session-id",
    "frame_id": 101
  },
  "policy": {
    "mode": "off|readOnly|fullControl",
    "workspace_trusted": true,
    "requires_confirmation": true,
    "audit_required": true
  },
  "execution": {
    "transport_preference": "auto|bridge|embedded|fallback",
    "timeout_ms": 2000,
    "queue_class": "read|control|mutation",
    "budget_class": "compact|standard|expanded|diagnostic"
  },
  "arguments": {}
}
```

## Normalization Rules

### Tool Resolution

- host-specific names or aliases must resolve to one canonical tool id
- unresolved tool names fail with `INVALID_ARGUMENT`

### Session Resolution

- `session_selector=explicit` when a valid `session_id` is supplied
- `session_selector=active` when the caller omits `session_id`
- `session_selector=none` only for requests that do not require a live session, such as partial `get_capabilities`

### Frame Resolution

- if `frame_id` is omitted, the runtime resolver may bind the active frame
- if a tool requires a frame and none can be resolved, fail with `FRAME_REQUIRED`

### Confirmation Resolution

- planner sets `requires_confirmation=true` based on the canonical policy matrix
- hosts may render the confirmation differently, but must preserve the planner outcome

### Budget Resolution

- planner assigns the default budget class from the tool contract
- hosts may request smaller responses, not larger defaults, unless explicitly allowed

## Idempotency Rules

| Tool | Retry Guidance |
| --- | --- |
| `get_state` | safe to retry |
| `get_variables_snapshot` | safe to retry |
| `get_runtime_context` | safe to retry |
| `get_capabilities` | safe to retry |
| `get_audit_log` | safe to retry |
| `control_execution` | not safely idempotent without runtime confirmation |
| `execute_keyword` | not safely idempotent |
| `execute_snippet` | not safely idempotent |
| `set_variable` | not safely idempotent |

Rule:

Automatic retries must be disabled for non-idempotent tools unless the tool contract later adds explicit deduplication semantics.

## Queueing Classes

| Queue Class | Tools | Rule |
| --- | --- | --- |
| `read` | inspection tools | may run concurrently if runtime safety allows |
| `control` | `control_execution` | serialized per session |
| `mutation` | `execute_keyword`, `execute_snippet`, `set_variable` | serialized per session |

## Audit Metadata

For audit-required plans, the planner must attach at least:

- `correlation_id`
- `tool`
- `surface.type`
- `surface.host`
- `session_id` if resolved
- a bounded human-readable summary seed

## Planner Outputs By Example

## Example: Read-Only LM Tool

```json
{
  "tool": "get_state",
  "contract_version": "1.0.0",
  "surface": {"type": "lm_tool", "host": "vscode"},
  "target": {"session_selector": "active", "frame_id": null},
  "policy": {
    "mode": "readOnly",
    "workspace_trusted": true,
    "requires_confirmation": false,
    "audit_required": false
  },
  "execution": {
    "transport_preference": "auto",
    "timeout_ms": 1000,
    "queue_class": "read",
    "budget_class": "compact"
  },
  "arguments": {"include_stack": true, "include_scopes": true}
}
```

## Example: Mutating MCP Tool

```json
{
  "tool": "set_variable",
  "contract_version": "1.0.0",
  "surface": {"type": "mcp", "host": "cline"},
  "target": {"session_selector": "explicit", "session_id": "session-1", "frame_id": 101},
  "policy": {
    "mode": "fullControl",
    "workspace_trusted": true,
    "requires_confirmation": true,
    "audit_required": true
  },
  "execution": {
    "transport_preference": "auto",
    "timeout_ms": 2000,
    "queue_class": "mutation",
    "budget_class": "compact"
  },
  "arguments": {"name": "${ORDER_ID}", "value": "42", "scope": "test"}
}
```

## Non-Goals For Version 1

- speculative multi-step planning in the core contract
- batch tool invocation plans
- cross-session transactional semantics
- hidden host-only planner branches
