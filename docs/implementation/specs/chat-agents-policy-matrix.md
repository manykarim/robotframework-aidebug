# Chat Agents Policy Matrix

## Purpose

This document defines the policy model for chat-agent tool execution.

The model applies uniformly across:

- VS Code LM tools
- chat participant orchestration
- MCP tools

## Operating Modes

| Mode | Meaning |
| --- | --- |
| `off` | no agent-exposed debug actions are allowed |
| `readOnly` | inspection tools only |
| `fullControl` | inspection, control, execution, and mutation tools may run subject to confirmations and trust |

## Core Policy Rules

1. `off` denies all tools.
2. `readOnly` allows only inspection-class tools.
3. `fullControl` allows all tools, subject to additional checks.
4. Mutating and execution tools require a live target session and a paused runtime context.
5. Workspace trust is required before exposing or executing mutating tools.
6. HTTP MCP transport is disabled by default and must be explicitly enabled.
7. All mutating and execution tools are auditable.

## Tool Classes

| Class | Tools |
| --- | --- |
| inspection | `get_state`, `get_variables_snapshot`, `get_runtime_context`, `get_capabilities`, `get_audit_log` |
| control | `control_execution` |
| execution | `execute_keyword`, `execute_snippet` |
| mutation | `set_variable` |

## Mode Matrix

| Tool | `off` | `readOnly` | `fullControl` |
| --- | --- | --- | --- |
| `get_state` | deny | allow | allow |
| `get_variables_snapshot` | deny | allow | allow |
| `get_runtime_context` | deny | allow | allow |
| `get_capabilities` | deny | allow | allow |
| `get_audit_log` | deny | allow | allow |
| `control_execution` | deny | deny | allow with confirmation |
| `execute_keyword` | deny | deny | allow with confirmation |
| `execute_snippet` | deny | deny | allow with confirmation |
| `set_variable` | deny | deny | allow with confirmation |

## Additional Checks

| Check | Applies To | Rule |
| --- | --- | --- |
| workspace trust | control, execution, mutation | required |
| paused session | execution, mutation | required |
| active session | all except some `get_capabilities` paths | required |
| confirmation | control, execution, mutation | required by default |
| audit log | control, execution, mutation | mandatory |
| redaction | all tools | mandatory before agent-visible output |

## Confirmation Policy

### Confirm By Default

- `control_execution`
- `execute_keyword`
- `execute_snippet`
- `set_variable`

### No Confirmation By Default

- `get_state`
- `get_variables_snapshot`
- `get_runtime_context`
- `get_capabilities`
- `get_audit_log`

### Host Rule

If the host offers its own confirmation primitive, the product must still enforce the same policy outcome. Host UX convenience is not a substitute for product policy.

## Workspace Trust Rules

1. Untrusted workspaces may expose read-only inspection tools only if the transport itself is local and no mutating action is possible.
2. Mutating and execution tools are not available in untrusted workspaces.
3. If a host caches tool availability, the extension must refresh exposure when trust changes.

## Session Rules

1. `get_capabilities` may return partial information even when no session exists.
2. `get_state`, `get_variables_snapshot`, `get_runtime_context`, and `get_audit_log` require a resolved target session unless explicitly documented otherwise.
3. `execute_keyword`, `execute_snippet`, and `set_variable` require a paused frame-aware runtime.
4. `control_execution` requires a resolved session but may act on stopped or running states depending on the requested action.

## HTTP MCP Rules

1. `stdio` is the default MCP transport.
2. `HTTP` must be explicitly enabled by configuration.
3. `HTTP` should bind to loopback by default.
4. `HTTP` requires authentication or equivalent local authorization.
5. `HTTP` exposure state must be visible in diagnostics and capability reporting.

## Denial Priorities

When multiple policy failures apply, return the earliest actionable denial in this order:

1. `POLICY_MODE_DENIED`
2. `WORKSPACE_TRUST_REQUIRED`
3. `CONFIRMATION_REQUIRED`
4. `SESSION_NOT_FOUND` or `SESSION_AMBIGUOUS`
5. `MUTATION_REQUIRES_PAUSED_SESSION`

## Audit Requirements

Audit records are mandatory for:

- all control tools
- all execution tools
- all mutation tools
- security-sensitive denials involving trust or forbidden HTTP access

Audit records are optional but recommended for read-only inspection failures.
