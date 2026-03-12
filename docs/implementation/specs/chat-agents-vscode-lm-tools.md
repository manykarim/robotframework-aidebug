# Chat Agents VS Code LM Tool Surface

## Purpose

This document specifies the `M2` and `M3` native VS Code language-model tool surface for `robotframework-aidebug`.

It covers:

- read-only LM tools
- mutating LM tools
- confirmation behavior
- host adaptation rules
- testing and release gates

## Scope

The native surface is intended for Copilot-style agent mode and other VS Code hosts that support extension-contributed LM tools.

The shared core remains authoritative for:

- tool contracts
- policy
- routing
- shaping
- audit

This document defines only the VS Code-specific exposure and adaptation rules.

## Surface Goals

1. expose canonical tools natively in VS Code
2. keep read-only inspection low-friction
3. require confirmation for mutating tools
4. preserve canonical failure semantics while fitting VS Code host UX
5. avoid host-specific semantic drift

## Tool Exposure Sets

### `M2` Read-Only Set

- `get_state`
- `get_variables_snapshot`
- `get_runtime_context`
- `get_capabilities`
- `get_audit_log`

### `M3` Mutating Set

- `control_execution`
- `execute_keyword`
- `execute_snippet`
- `set_variable`

## Contribution Rules

1. Each canonical tool maps to one VS Code LM tool id.
2. Tool labels may be human-friendly, but canonical ids remain traceable.
3. Tool input schemas must mirror the canonical contract without hidden host-only arguments.
4. Read-only tools should be exposed by default when policy allows them.
5. Mutating tools should be exposed only when policy and trust settings permit them.

## Tool Metadata Rules

Per tool definition, specify:

- human-facing title
- short description
- input schema
- whether confirmation is expected
- when-clause or contextual visibility rule where host support exists

Required metadata qualities:

- concise
- action-specific
- not misleading about side effects
- safe for model consumption

## Confirmation Model

### Default Rule

The host must present confirmation for:

- `control_execution`
- `execute_keyword`
- `execute_snippet`
- `set_variable`

### Preparation Rule

The LM tool adapter should use invocation-preparation hooks to:

- summarize the pending action
- state the target session/frame where known
- avoid secret-bearing previews
- surface the policy mode and why confirmation is required when useful

### Confirmation Preview Examples

Good:

- `Execute keyword 'Log' with 1 argument in the current paused frame.`
- `Set variable ${ORDER_ID} in test scope.`
- `Step over the current statement in the active debug session.`

Bad:

- full variable values in the preview
- raw multiline snippets with secrets or large bodies
- host-specific jargon without the actual action

## Result Adaptation Rules

1. The canonical result envelope remains the source of truth.
2. The LM tool adapter may render a concise host-facing summary, but must keep `correlation_id` and canonical `error.code` recoverable.
3. `partial` results must remain visibly partial.
4. `denied` results must communicate policy cause, not masquerade as generic host failure.

## Visibility And Discovery Rules

1. Read-only tools should be discoverable whenever the extension is active and policy allows them.
2. Mutating tools should be hidden or disabled in `readOnly` mode and untrusted workspaces.
3. If the host caches tool visibility, the extension must refresh exposure when:
   - workspace trust changes
   - control mode changes
   - debug session state changes materially

## Cancellation And Progress Rules

1. Long-running tools must propagate host cancellation to the shared core.
2. Progress messages must be concise and operational, not chatty.
3. Mutating progress messages must avoid secrets.
4. The host should prefer progress UI over large intermediate text payloads.

## Error Mapping Rules

| Canonical Status | Native LM Tool Behavior |
| --- | --- |
| `success` | return successful tool result |
| `partial` | return successful tool result with bounded-content summary |
| `denied` | return host-safe denial result; do not convert to generic exception unless required |
| `failure` | return or throw host-visible failure while preserving canonical code and correlation id |

## Required Native Journeys

### Journey 1: Inspect Paused Session

1. tool asks for state
2. tool asks for variables
3. tool asks for runtime context
4. agent receives bounded, correlated results

### Journey 2: Controlled Runtime Mutation

1. tool asks to set a variable
2. host prompts for confirmation
3. policy still re-evaluates at execution time
4. audit event is recorded
5. bounded result is returned

### Journey 3: Denied Execution In `readOnly`

1. tool asks to execute a keyword
2. host gets denial/confirmation-required result
3. no runtime invocation occurs

## Test Requirements

### Unit

- tool registration metadata
- schema-to-contract mapping
- confirmation-preview generation
- envelope adaptation rules

### Integration

- read-only tool call against fake core
- mutating tool call with confirmation
- denial in `readOnly`
- trust-state visibility changes
- cancellation propagation

### End-To-End

- one native read-only paused-session journey
- one native mutation journey
- one denied mutation journey

## Release Gates

### `M2` Gate

Required:

- read-only tool contributions complete
- read-only journeys pass
- shaping and redaction verified
- no mutating tools exposed by accident

### `M3` Gate

Required:

- mutating tool contributions complete
- confirmation flows pass
- audit coverage complete
- denial and cancellation paths pass

## Non-Goals

- replacing VS Code agent orchestration logic
- host-specific hidden tools for special agents
- bypassing canonical tool contracts to optimize prompt wording
