# Chat Agents Implementation Plan

## Goal

Deliver full chat-agent integration for `robotframework-aidebug` across VS Code-native agents such as GitHub Copilot and MCP-native agents such as Cline, using one shared debug-control application layer.

## Success Criteria

1. Native VS Code agent mode can invoke `robotframework-aidebug` LM tools to inspect and control live debug sessions.
2. A dedicated chat participant can guide users through debug workflows and orchestrate tools when needed.
3. MCP-native clients can consume a portable MCP surface with equivalent semantics for supported operations.
4. Read-only, mutating, and execution actions obey the same safety and audit policy across all surfaces.
5. Performance, reliability, token discipline, and compatibility requirements are validated continuously.

## Scope

### In Scope

- VS Code LM tools
- optional `@robotdebug` chat participant
- MCP server for non-native clients
- optional extension-registered MCP server definition provider for turnkey discovery in VS Code
- shared application/domain contracts
- policy, redaction, confirmations, audit, token budgeting, observability

### Out Of Scope For First Delivery Slice

- replacing existing Copilot or Cline orchestration logic
- remote multi-user collaboration semantics
- unbounded autonomous execution without explicit policy design
- custom language model provider implementation

## Architecture

### Surface Layers

1. `LM Tool Surface`
   - declarative `languageModelTools`
   - `vscode.lm.registerTool`
   - tool input schemas and host confirmation flow
2. `Chat Participant Surface`
   - `contributes.chatParticipants`
   - `vscode.chat.createChatParticipant`
   - slash commands, follow-ups, participant detection
3. `MCP Surface`
   - stdio server first
   - optional HTTP transport
   - tool annotations, prompts, resources, instructions

### Shared Application Layer

Responsibilities:

- normalize host requests into typed invocation plans
- select bridge or embedded runtime transport
- enforce policy and confirmations
- shape results for token budgets
- log audit events and telemetry

## Workstreams

### Workstream 1: Shared Tool Contracts

Deliverables:

1. canonical tool catalog
2. input/output schemas
3. read-only versus mutating metadata
4. token budget classes
5. failure and remediation codes

Representative tools:

- `get_state`
- `get_variables_snapshot`
- `get_runtime_context`
- `get_capabilities`
- `get_audit_log`
- `control_execution`
- `execute_keyword`
- `execute_snippet`
- `set_variable`

Acceptance:

- all surfaces map to the same canonical semantics
- contracts explicitly describe limits and failure conditions

### Workstream 2: LM Tool Surface

Deliverables:

1. `package.json` `languageModelTools` entries
2. `vscode.lm.registerTool` implementations
3. `prepareInvocation()` logic for confirmations and progress text
4. token-aware result shaping
5. `when` clauses to scope tools to debugging contexts where appropriate

Acceptance:

- tools are visible in agent mode
- mutating tools request confirmation
- read-only tools remain low-friction
- result envelopes stay within budget by default

### Workstream 3: Chat Participant

Deliverables:

1. `@robotdebug` participant
2. optional slash commands such as `/state`, `/variables`, `/recover`
3. follow-up provider
4. participant detection metadata
5. history-aware orchestration strategy

Acceptance:

- participant can guide a paused debug workflow end to end
- participant uses shared tools or application commands rather than bypassing policy

### Workstream 4: MCP Server Surface

Deliverables:

1. MCP tool definitions for the canonical tool catalog
2. stdio transport
3. optional HTTP transport with explicit opt-in
4. prompts and server instructions for discover-then-act workflows
5. resources for logs, audit views, or bounded state artifacts where useful

Inspiration from `rf-mcp`:

- server instructions to guide client behavior
- transport portability
- validation and token-efficiency discipline
- compatibility adapter around evolving MCP frameworks

Acceptance:

- Cline-class clients can discover and invoke the supported tool set
- read-only tools are annotated accordingly when host semantics support it
- HTTP remains disabled by default

### Workstream 5: Extension-Registered MCP Server Definitions

Deliverables:

1. `contributes.mcpServerDefinitionProviders`
2. `vscode.lm.registerMcpServerDefinitionProvider`
3. workspace-aware resolution of stdio or HTTP server definitions
4. optional quick-install/discovery UX inside VS Code

Acceptance:

- VS Code can discover the packaged MCP server without manual JSON when enabled
- server definitions remain explicit and least-privilege

### Workstream 6: Safety And Governance

Deliverables:

1. one policy model for all agent surfaces
2. host-specific confirmation mapping
3. workspace trust gating
4. redaction and truncation everywhere
5. HTTP authentication and loopback binding if HTTP is enabled
6. audit and retention policy

Acceptance:

- no mutating action bypasses policy because of surface differences
- cloud-visible outputs are redacted consistently

### Workstream 7: Performance And Reliability

Deliverables:

1. token-budget-aware result shaping
2. streaming/progress model for long operations
3. cancellation propagation
4. queueing and concurrency rules for agent-triggered runtime operations
5. per-surface latency metrics

Acceptance:

- no extension event-loop blocking
- no unbounded tool outputs
- timeouts and cancellations are explicit and actionable

### Workstream 8: Observability And Diagnostics

Deliverables:

1. correlation ids across agent surfaces
2. structured logs with host/surface metadata
3. metrics for latency, truncation, denials, confirmations, and failures
4. debug output channels or MCP diagnostics for local troubleshooting

Acceptance:

- host-specific failures are diagnosable
- compatibility issues are attributable to surface and version

### Workstream 9: Test And Validation Strategy

Deliverables:

1. unit tests for tool schemas and planners
2. extension integration tests for LM tools and chat participant flows
3. MCP protocol tests for stdio and HTTP
4. full end-to-end journeys with native and MCP clients where automatable
5. compatibility matrix for VS Code, RobotCode, Robot Framework, and chosen MCP framework versions

Acceptance:

- each supported surface has at least one end-to-end journey test
- mutating tools are covered by confirmation and denial tests
- payload budgets are validated automatically

## Phased Delivery

### Phase 0: Architecture And Contracts Freeze

1. approve ADR set
2. freeze canonical tool catalog
3. freeze governance and budget rules

### Phase 1: Native Read-Only LM Tools

1. `get_state`
2. `get_variables_snapshot`
3. `get_runtime_context`
4. `get_capabilities`
5. `get_audit_log`

Exit criteria:

- Copilot-style agent mode can inspect a paused session through native tools
- result budgets are under control

### Phase 2: Native Mutating LM Tools

1. `set_variable`
2. `execute_keyword`
3. `execute_snippet`
4. `control_execution`
5. confirmation UX and audit completion

Exit criteria:

- mutating and execution flows are safe, confirmed, and auditable

### Phase 3: Chat Participant

1. `@robotdebug`
2. slash commands
3. follow-ups and detection
4. history-aware guidance

Exit criteria:

- user can drive a guided debug workflow conversationally

### Phase 4: MCP Server STDIO

1. canonical MCP tools
2. server instructions and prompts
3. validation and result shaping
4. Cline-class client validation

Exit criteria:

- stdio MCP client can perform supported workflows safely

### Phase 5: Optional MCP HTTP And Provider Registration

1. HTTP transport
2. auth and loopback controls
3. VS Code MCP server definition provider
4. optional resources and prompts expansion

Exit criteria:

- HTTP is secure and optional
- VS Code can discover the MCP server through the extension when enabled

### Phase 6: Hardening And Compatibility

1. version matrix expansion
2. performance tuning
3. release and migration documentation
4. compatibility adapters for evolving host frameworks if needed

Exit criteria:

- stable release posture across supported host surfaces

## Security Plan

1. read-only tools stay confirmation-free where host semantics permit
2. mutating tools require confirmations with explicit context
3. `toolReferenceName` and descriptions avoid over-broad capabilities
4. HTTP transport binds to loopback by default and requires explicit authentication if enabled
5. prompts and server instructions never replace server-side validation
6. sensitive values are redacted in tool results, audit, logs, and resources

## Reliability Plan

1. host-specific failures return machine-readable remediation messages
2. retry only read-only tool failures that are known transient
3. use queueing or serialization for mutating runtime actions to avoid concurrent corruption
4. propagate cancellation from host to runtime where possible

## Performance Plan

1. implement per-tool token budgets
2. use pagination and scope filters for potentially large responses
3. cap completion counts and audit entry counts by default
4. measure p50 and p95 across LM and MCP surfaces separately
5. prefer structured summaries over raw object dumps

## Interoperability Plan

1. native VS Code tools are the primary surface inside VS Code
2. MCP is the portability surface
3. chat participant is an orchestration convenience surface
4. a shared application layer ensures semantic parity
5. use adapter boundaries to absorb MCP framework churn, taking cues from `rf-mcp` compatibility patterns

## Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LM tool schemas are too vague | wrong tool calls | explicit schemas, examples, strict validation |
| Tool outputs are too large | degraded chat quality | token budgets, summarization, pagination |
| Host confirmation semantics vary | unsafe mutations | central confirmation policy plus surface adapters |
| MCP framework drift | integration breakage | compatibility adapter layer, pinned matrix |
| HTTP transport increases attack surface | security incident | stdio-first, loopback-only, auth, explicit opt-in |
| Participant conflicts with built-in participants | poor routing | optional participant, careful disambiguation |
| Bridge-mode differences across RobotCode versions | inconsistent live behavior | capability probes and compatibility matrix |

## Recommended First Release Shape

1. native read-only LM tools
2. native mutating LM tools with confirmations
3. stdio MCP surface for equivalent core tools
4. no HTTP by default
5. optional chat participant after tools are stable
