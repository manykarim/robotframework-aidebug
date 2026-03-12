# Chat Agents Failure Codes

## Purpose

This registry defines stable failure codes for chat-agent integrations.

These codes apply across:

- VS Code LM tools
- chat participant orchestration
- MCP tools
- shared application services

## Naming Rules

- codes use `UPPER_SNAKE_CASE`
- codes are stable across host surfaces
- codes identify the dominant failure cause, not every symptom
- host-specific or upstream errors may be attached separately as `upstream_code`

## Policy And Trust Failures

| Code | Meaning | Retryable |
| --- | --- | --- |
| `POLICY_MODE_DENIED` | current control mode does not allow the requested action | no |
| `WORKSPACE_TRUST_REQUIRED` | workspace trust is required before tool exposure or execution | yes |
| `CONFIRMATION_REQUIRED` | host must obtain user confirmation before continuing | yes |
| `MUTATION_REQUIRES_PAUSED_SESSION` | operation is mutating and no paused session is available | yes |
| `TOOL_NOT_EXPOSED_ON_SURFACE` | the host surface intentionally does not expose the tool | no |

## Session And Routing Failures

| Code | Meaning | Retryable |
| --- | --- | --- |
| `SESSION_NOT_FOUND` | no active or matching session could be resolved | yes |
| `SESSION_AMBIGUOUS` | multiple sessions matched and explicit selection is required | yes |
| `SESSION_TERMINATED` | target session ended before operation completed | yes |
| `TRANSPORT_UNAVAILABLE` | required transport is unavailable | yes |
| `CAPABILITY_UNAVAILABLE` | runtime does not support the requested operation | no |

## Validation Failures

| Code | Meaning | Retryable |
| --- | --- | --- |
| `INVALID_ARGUMENT` | input failed schema or semantic validation | yes |
| `UNSUPPORTED_SCOPE` | variable scope or action scope is not supported | yes |
| `FRAME_REQUIRED` | the operation requires a frame but none was resolved | yes |
| `ITEM_LIMIT_EXCEEDED` | requested limits exceed policy or host bounds | yes |
| `PAYLOAD_TOO_LARGE` | request payload exceeds allowed size | yes |

## Runtime Failures

| Code | Meaning | Retryable |
| --- | --- | --- |
| `RUNTIME_STATE_UNAVAILABLE` | runtime state could not be queried | yes |
| `RUNTIME_VARIABLE_READ_FAILED` | variable lookup or snapshot generation failed | yes |
| `RUNTIME_VARIABLE_SET_FAILED` | variable mutation failed at runtime | yes |
| `RUNTIME_KEYWORD_FAILED` | keyword execution failed | no |
| `RUNTIME_SNIPPET_FAILED` | snippet execution failed | no |
| `RUNTIME_CONTROL_FAILED` | execution control request failed | yes |

## Timeout And Cancellation Failures

| Code | Meaning | Retryable |
| --- | --- | --- |
| `TOOL_TIMEOUT` | tool execution exceeded the allowed time budget | yes |
| `TOOL_CANCELLED` | caller or host cancelled the operation | yes |
| `QUEUE_REJECTED` | operation could not enter the runtime queue | yes |

## Result-Shaping And Security Failures

| Code | Meaning | Retryable |
| --- | --- | --- |
| `REDACTION_FAILURE` | required redaction could not be completed safely | no |
| `RESULT_SHAPING_FAILED` | bounded result shaping failed | yes |
| `HTTP_AUTH_REQUIRED` | HTTP MCP endpoint requires authentication | yes |
| `HTTP_FORBIDDEN` | HTTP MCP caller lacks authorization | no |

## Compatibility Failures

| Code | Meaning | Retryable |
| --- | --- | --- |
| `HOST_VERSION_UNSUPPORTED` | host version is outside the supported range | no |
| `RUNTIME_VERSION_UNSUPPORTED` | runtime dependency version is outside the supported range | no |
| `PROTOCOL_VERSION_MISMATCH` | the client and server contract versions are incompatible | no |

## Error Mapping Rules

1. Policy failures become `denied` envelopes unless the host requires a pre-confirmation placeholder.
2. Validation, runtime, and compatibility failures become `failure` envelopes.
3. `CONFIRMATION_REQUIRED` may be represented by host-native confirmation UX before the shared core returns a final envelope.
4. If multiple failure causes exist, prefer the earliest actionable cause.

## Remediation Guidance Rules

Recommended remediation text should:

- be one sentence where possible
- describe the next human or agent action
- avoid leaking secrets or internal stack details
- not blame the host if the product can explain the boundary clearly
