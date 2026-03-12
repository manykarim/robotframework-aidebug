# Chat Agents Domain Model

## Aggregate: AgentSurfaceSession

Represents one host-facing agent session bound to a debug context.

### Identity

- `surfaceType`: `lmTool | chatParticipant | mcp`
- `hostClient`
- `sessionId`
- `conversationId?`

### State

- `controlMode`
- `clientCapabilityProfile`
- `toolInvocationBudget`
- `confirmationPolicy`
- `activeDebugSessionId?`
- `recentToolResults`

### Invariants

1. Every tool invocation resolves to exactly one transport path.
2. Mutating actions require both policy approval and host confirmation where supported.
3. Result envelopes are bounded before leaving the aggregate.

## Entity: AgentToolContract

### Fields

- `name`
- `surfaceExposure`
- `inputSchema`
- `readOnly`
- `requiresConfirmation`
- `tokenBudgetClass`
- `capabilityRequirements`

## Entity: InvocationPlan

Normalized action requested by an agent.

### Variants

- `InspectState`
- `InspectVariables`
- `InspectContext`
- `ControlExecution`
- `ExecuteKeyword`
- `ExecuteSnippet`
- `MutateVariable`
- `InspectAudit`
- `DiscoverCapabilities`

### Rules

- free-form prompt text is never executed directly
- all host inputs are normalized into a typed plan first

## Value Object: ResultEnvelope

### Fields

- `status`
- `summary`
- `payload`
- `truncated`
- `redactionsApplied`
- `estimatedTokens`
- `followups?`

## Value Object: ConfirmationRequirement

- `required`
- `reasonCode`
- `title`
- `message`
- `hostSupportsInlineConfirmation`

## Value Object: ClientCapabilityProfile

- `supportsNativeTools`
- `supportsChatParticipant`
- `supportsMcpTools`
- `supportsPrompts`
- `supportsResources`
- `supportsStreaming`
- `supportsInlineConfirmation`
- `supportsTokenBudgetHints`
