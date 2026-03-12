# Chat Agents Commands And Events

## Commands

| Command | Origin | Target | Purpose |
|---|---|---|---|
| `RegisterToolContracts` | Surface bootstrap | Agent Surfaces | publish native or MCP tool metadata |
| `NormalizeAgentRequest` | Agent Surface | Invocation Planner | convert host request into typed intent |
| `EvaluateConfirmation` | Invocation Planner | Governance | decide whether user confirmation is needed |
| `InvokeRuntimeAction` | Invocation Planner | Session Router | execute against bridge or embedded runtime |
| `ShapeResultEnvelope` | Invocation Planner | Result Shaping | bound and redact result for agent consumption |
| `PublishPromptGuidance` | MCP Surface | MCP Host | provide server instructions or prompts |
| `AttachFollowups` | Chat Participant | Agent Surface | offer next-step prompts |

## Events

| Event | Producer | Consumer | Notes |
|---|---|---|---|
| `AgentToolPrepared` | Agent Surface | Governance | pre-invocation metadata available |
| `ConfirmationRequired` | Governance | Host Surface | host-specific confirmation UX |
| `AgentToolInvoked` | Agent Surface | Audit | durable record |
| `AgentToolCompleted` | Invocation Planner | Host Surface | includes token estimate and truncation |
| `AgentToolFailed` | Invocation Planner | Host Surface | actionable machine-readable failure |
| `PromptGuidancePublished` | MCP Surface | MCP Host | server instructions or prompts exposed |
| `ClientCapabilityResolved` | Agent Surface | Invocation Planner | host capability profile selected |
