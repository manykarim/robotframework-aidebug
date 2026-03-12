# Chat Agents MCP Surface

## Purpose

This document specifies the `M5` and `M6` MCP surface for `robotframework-aidebug`.

It covers:

- MCP `stdio` transport
- optional MCP `HTTP` transport
- tool mapping
- prompts/resources/instructions
- VS Code discovery integration

## Strategic Role

The MCP surface is the portability path for:

- Cline
- other MCP-native clients
- future hosts that consume MCP rather than VS Code-native LM tools

## Design Goals

1. provide the same canonical tool semantics as native LM tools
2. keep `stdio` as the default local transport
3. make `HTTP` explicit, secure, and opt-in only
4. use prompts and instructions to guide inspect-first behavior
5. tolerate client and framework variance without semantic drift

## Transport Model

### Default: `stdio`

Use `stdio` as the default because it:

- avoids network exposure
- fits local agent workflows
- keeps installation simple
- aligns with `rf-mcp` portability patterns

### Optional: `HTTP`

Allow `HTTP` only when explicitly enabled.

Rules:

- loopback bind by default
- authentication or equivalent authorization required
- diagnostics must show exposure state clearly
- operational docs must explain the risk surface

## Tool Mapping Rules

1. Each MCP tool maps directly to one canonical tool id.
2. MCP tool names may be namespaced for usability, but canonical ids remain traceable.
3. Read-only tools must be annotated as read-only when host semantics support it.
4. Mutating tools must not appear read-only under any host annotation scheme.

## MCP Tool Set

Required for `M5`:

- `get_state`
- `get_variables_snapshot`
- `get_runtime_context`
- `get_capabilities`
- `get_audit_log`
- `control_execution`
- `execute_keyword`
- `execute_snippet`
- `set_variable`

## Prompts And Instructions

The MCP server should provide:

1. server instructions emphasizing inspect-first behavior
2. prompts for common workflows, such as:
   - inspect paused state
   - diagnose failing keyword
   - execute a diagnostic keyword safely
3. bounded examples showing how to request narrower scopes or smaller payloads

Instruction rules:

- guide behavior, do not replace validation
- never imply that confirmation or policy checks can be skipped
- prefer concise operational guidance over long tutorials

## Resources

Optional MCP resources may expose bounded artifacts such as:

- recent audit summaries
- capability snapshots
- troubleshooting notes

Rules:

- resources must remain bounded and redacted
- resources are not a replacement for tool calls when live data is needed

## VS Code MCP Server Discovery

If supported by the host and product scope:

- contribute an MCP server definition provider
- resolve local packaged `stdio` definitions automatically
- optionally expose explicit HTTP definitions when enabled

Rules:

1. discovery must respect workspace trust and local configuration.
2. discovery must not silently expose HTTP endpoints.
3. diagnostics must explain resolution failures clearly.

## Compatibility Rules

1. The MCP adapter layer must isolate framework churn from the shared core.
2. Host-specific MCP quirks must not leak into canonical contracts.
3. Server instructions and tool metadata should be tested against at least one real MCP client journey.

## Required Journeys

### `M5` Stdio Journey

1. client discovers tools over `stdio`
2. client inspects paused state
3. client requests runtime context
4. client receives bounded responses

### `M5` Mutation Journey

1. client requests a mutation or execution action
2. product enforces policy and confirmation semantics
3. result is audited and returned in canonical shape

### `M6` HTTP Journey

1. server is explicitly enabled with local-only settings
2. authenticated client connects
3. tool invocation succeeds or fails with canonical semantics
4. unauthenticated access is denied cleanly

## Test Requirements

### Protocol

- server startup and shutdown
- malformed request handling
- tool discovery
- prompt/resource registration where applicable

### Integration

- read-only stdio tool flow
- mutating stdio tool flow
- HTTP auth and loopback restrictions
- VS Code discovery provider resolution

### End-To-End

- one Cline-class read-only journey
- one mutation journey with policy enforcement
- one denied HTTP access journey if HTTP is enabled

## Release Gates

### `M5` Gate

Required:

- `stdio` server complete
- prompts/instructions complete
- protocol tests pass
- end-to-end stdio journey passes

### `M6` Gate

Required:

- HTTP remains opt-in
- auth and diagnostics pass
- VS Code discovery support works if advertised
- exposure and rollback docs are complete
