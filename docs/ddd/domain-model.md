# Domain Model

## Aggregate: AgentDebugSession

Represents the AI-facing control plane for one active RobotCode debug session.

### Identity

- `sessionId`
- `debugSessionType`
- `workspaceFolder`

### State

- `lifecycleState`: `inactive | running | paused | stopped`
- `mode`: `off | readOnly | fullControl`
- `policySnapshot`
- `topFrame`
- `recentEvents`
- `rateLimitWindow`

### Invariants

1. Only one active `AgentDebugSession` is selected per tool invocation.
2. Write commands are rejected unless `mode = fullControl`.
3. Execute commands are rejected unless the underlying debug session is paused.
4. Responses returned to the tool surface are already redacted.

## Entity: ExecutionSnapshot

A bounded projection returned by `robot/getExecutionState`.

### Fields

- `runtimeState`
- `threadId`
- `stopReason`
- `currentItem`
- `topFrame`
- `recentEvents`
- `capturedAt`

### Rules

- must be small enough for prompt-safe transport,
- must be derivable without mutating runtime state,
- must degrade gracefully if some data is unavailable.

## Entity: VariableSnapshot

A projection of variables in one or more scopes.

### Fields

- `frameId`
- `scopes`
- `items`
- `truncated`
- `redactionsApplied`

### Rules

- respects requested scope filters,
- enforces server-side size limits,
- never bypasses redaction policy.

## Entity: ExecutionCommand

Structured intent sent across the application boundary.

### Variants

- `GetExecutionState`
- `GetStack`
- `GetScopes`
- `GetVariables`
- `GetVariablesSnapshot`
- `SetVariable`
- `ExecuteKeyword`
- `ExecuteSnippet`
- `ControlExecution`

### Rules

- every command carries a resolved `sessionId`,
- write and execute commands include a policy evaluation result,
- commands are idempotent only for reads, never assumed for writes.

## Value Object: KeywordInvocation

- `keyword`
- `args[]`
- `assign[]`
- `frameId`
- `timeoutSec`
- `captureLog`

Invariant: the keyword name must be explicit and argument ordering must be preserved.

## Value Object: SnippetEnvelope

Represents a multi-line Robot body fragment wrapped into a synthetic test case for parsing.

### Why It Exists

The experiment set showed that `get_model()` treats raw body fragments as an implicit comment section instead of executable body content. Snippets therefore require a wrapper before they can become a `TestSuite` model.

### Fields

- `suiteName`
- `testName`
- `indentedBody`
- `originalSnippet`

## Value Object: AgentActionPolicy

- `workspaceTrusted`
- `featureEnabled`
- `mode`
- `redactPatterns[]`
- `maxValueChars`
- `maxItems`
- `maxExecutionsPerMinute`

Invariant: `mode = off` rejects every command except explanatory status reads.

## Entity: AuditEntry

- `timestamp`
- `sessionId`
- `toolName`
- `commandType`
- `sanitizedArguments`
- `result`
- `durationMs`

Rule: audit entries never store raw secrets even if the original command carried them.
