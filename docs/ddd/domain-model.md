# Domain Model

## Aggregate: AgentDebugSession

Represents the AI-facing control plane for one selected live debug session.

### Identity

- `sessionId`
- `sessionType`
- `workspaceFolder`
- `transportMode`: `bridge | embedded`

### State

- `lifecycleState`: `inactive | starting | running | paused | stopped | degraded`
- `controlMode`: `off | readOnly | fullControl`
- `capabilities`
- `policySnapshot`
- `selectedFrameId`
- `recentEvents`
- `lastHealthCheckAt`

### Invariants

1. Exactly one session is selected per tool invocation.
2. Mutating and execution operations are rejected unless `controlMode = fullControl`.
3. Runtime execution is rejected unless the selected session is paused and healthy.
4. All tool-facing payloads are bounded and redacted before leaving the aggregate boundary.

## Entity: CapabilitySet

Describes what the selected live session can actually do.

### Fields

- `canReadState`
- `canReadVariables`
- `canSetVariables`
- `canEvaluate`
- `canExecuteKeyword`
- `canExecuteSnippet`
- `canProvideRuntimeCompletions`
- `requiresRobotSyncAck`
- `supportsStructuredRequests`

### Rule

Capabilities are inferred by transport type, version checks, and explicit probing. Unsupported features must fail explicitly, never silently degrade into unsafe alternatives.

## Entity: ExecutionSnapshot

Bounded runtime projection.

### Fields

- `runtimeState`
- `stopReason`
- `threadId`
- `topFrame`
- `currentItem`
- `recentOutput`
- `capturedAt`
- `source`: `cache | live`

## Entity: VariableSnapshot

Bounded view of visible variables.

### Fields

- `frameId`
- `scopes`
- `items`
- `truncated`
- `redactionsApplied`
- `captureDurationMs`

## Entity: RuntimeCommand

Transport-neutral description of requested runtime work.

### Variants

- `GetExecutionState`
- `GetStack`
- `GetScopes`
- `GetVariables`
- `GetVariablesSnapshot`
- `SetVariable`
- `ExecuteKeyword`
- `ExecuteSnippet`
- `ContinueExecution`
- `PauseExecution`
- `StepOver`
- `StepIn`
- `StepOut`
- `GetRuntimeCompletions`

## Value Object: KeywordInvocation

- `keyword`
- `args`
- `assign`
- `frameId`
- `timeoutSec`
- `captureLog`

Invariant: argument order is preserved exactly and assignment targets are explicit.

## Value Object: SnippetEnvelope

Represents a Robot body fragment wrapped into a synthetic test case.

### Fields

- `suiteName`
- `testName`
- `originalSnippet`
- `wrappedSource`

### Verified Rule

Raw snippets do not become executable body nodes without the wrapper. This was re-confirmed with `uv run` on 2026-03-08.

## Value Object: PolicyDecision

- `allowed`
- `mode`
- `reasonCode`
- `redactionRules`
- `rateLimitWindow`
- `timeoutBudgetMs`

## Entity: AuditEntry

- `correlationId`
- `timestamp`
- `sessionId`
- `transportMode`
- `toolName`
- `commandType`
- `sanitizedArguments`
- `outcome`
- `durationMs`

Rule: audit records never retain raw secrets or unbounded console output.
