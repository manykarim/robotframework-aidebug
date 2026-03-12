# Chat Agents Result Envelopes

## Purpose

This document defines the canonical response wrapper for all chat-agent tool invocations.

All LM tools, chat participant orchestration actions, and MCP tools must normalize responses into these envelopes before host-specific adaptation.

## Envelope Types

1. `success`
2. `partial`
3. `denied`
4. `failure`

## Common Fields

Every envelope includes:

```json
{
  "status": "success|partial|denied|failure",
  "tool": "get_state",
  "correlation_id": "string",
  "contract_version": "1.0.0",
  "session_id": "string-or-null",
  "truncated": false,
  "redacted": false,
  "duration_ms": 12.3,
  "surface": "lm_tool|chat_participant|mcp"
}
```

Field rules:

- `correlation_id` is mandatory for diagnostics and audit correlation.
- `session_id` may be `null` when no session exists or session targeting failed before resolution.
- `truncated` indicates output shaping changed the payload size or item count.
- `redacted` indicates at least one value was removed or masked.
- `duration_ms` is measured at the shared application layer, not only at the host boundary.

## Success Envelope

Use when the requested operation completed as intended.

```json
{
  "status": "success",
  "tool": "get_state",
  "correlation_id": "corr-123",
  "contract_version": "1.0.0",
  "session_id": "session-1",
  "truncated": false,
  "redacted": false,
  "duration_ms": 18.2,
  "surface": "lm_tool",
  "payload": {}
}
```

Rules:

- `payload` must match the canonical tool payload schema.
- no `error` object is included.
- success may still have `redacted=true` if values were masked safely.

## Partial Envelope

Use when the operation completed, but the returned content was intentionally bounded.

```json
{
  "status": "partial",
  "tool": "get_variables_snapshot",
  "correlation_id": "corr-123",
  "contract_version": "1.0.0",
  "session_id": "session-1",
  "truncated": true,
  "redacted": true,
  "duration_ms": 22.0,
  "surface": "mcp",
  "payload": {},
  "continuation": {
    "reason": "item_cap|max_bytes|redaction_policy",
    "next_hint": "Request a smaller scope set or a lower-level follow-up call."
  }
}
```

Rules:

- `partial` is not an error.
- `continuation` is required.
- clients should treat `partial` as a usable response with explicit bounds.

## Denied Envelope

Use when policy blocks the requested operation before runtime execution.

```json
{
  "status": "denied",
  "tool": "set_variable",
  "correlation_id": "corr-123",
  "contract_version": "1.0.0",
  "session_id": "session-1",
  "truncated": false,
  "redacted": false,
  "duration_ms": 3.1,
  "surface": "lm_tool",
  "error": {
    "code": "POLICY_MODE_DENIED",
    "message": "Mutating tools are disabled in readOnly mode.",
    "retryable": false,
    "remediation": "Switch to fullControl and confirm the action."
  },
  "policy": {
    "mode": "readOnly",
    "requires_confirmation": true,
    "decision": "denied"
  }
}
```

Rules:

- no runtime side effect may occur before a `denied` response.
- `error.code` must come from the canonical failure-code registry.
- `policy` is required for denied responses.

## Failure Envelope

Use when the operation was allowed but did not complete successfully.

```json
{
  "status": "failure",
  "tool": "execute_keyword",
  "correlation_id": "corr-123",
  "contract_version": "1.0.0",
  "session_id": "session-1",
  "truncated": false,
  "redacted": true,
  "duration_ms": 481.0,
  "surface": "chat_participant",
  "error": {
    "code": "RUNTIME_KEYWORD_FAILED",
    "message": "Keyword execution failed.",
    "retryable": false,
    "remediation": "Inspect the current frame and keyword arguments before retrying."
  },
  "details": {
    "failure_stage": "runtime",
    "host_context": "bridge"
  }
}
```

Rules:

- `error` is required.
- `details` may contain bounded diagnostics.
- `failure` may still include partial payload fragments only if they are safe and documented by the tool contract.

## Error Object

```json
{
  "code": "SESSION_NOT_FOUND",
  "message": "No active debug session was found.",
  "retryable": true,
  "remediation": "Start or select a debug session, then retry.",
  "upstream_code": "optional-host-or-runtime-code"
}
```

Field rules:

- `code` is canonical and stable.
- `message` is user-facing, concise, and host-safe.
- `retryable` indicates whether an automatic or human retry may succeed without code changes.
- `remediation` should be present unless it adds no value.
- `upstream_code` is optional and must not replace the canonical code.

## Host Adaptation Rules

1. VS Code LM tools may map envelope fields into tool result metadata, but must not drop `correlation_id` or `error.code`.
2. Chat participants may summarize the envelope for user-facing prose, but the underlying tool result must remain traceable.
3. MCP tools may add host-expected wrappers, but the canonical envelope must remain reconstructible.

## Serialization Rules

- UTF-8 JSON only
- no binary fields
- timestamps in ISO 8601 UTC when present
- numbers must use JSON numbers, not strings, unless precision or host compatibility requires otherwise
