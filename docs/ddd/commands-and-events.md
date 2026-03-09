# Commands And Events

## Commands

| Command | Producer | Consumer | Purpose |
|---|---|---|---|
| `ResolveSession` | Agent Experience | Session Orchestration | choose active session and transport |
| `ProbeCapabilities` | Session Orchestration | Runtime Debug Control | determine supported live features |
| `GetExecutionState` | Agent Experience | Runtime Debug Control | bounded runtime summary |
| `GetStack` | Agent Experience | Runtime Debug Control | live frame list |
| `GetScopes` | Agent Experience | Runtime Debug Control | variable scopes for a frame |
| `GetVariables` | Agent Experience | Runtime Debug Control | deep variable traversal |
| `GetVariablesSnapshot` | Agent Experience | Runtime Debug Control | bounded scope snapshot |
| `SetVariable` | Agent Experience | Runtime Debug Control | mutate one variable |
| `ExecuteKeyword` | Agent Experience | Runtime Debug Control | run one paused-context keyword |
| `ExecuteSnippet` | Agent Experience | Runtime Debug Control | run one paused-context Robot body snippet |
| `ControlExecution` | Agent Experience | Runtime Debug Control | pause, continue, next, stepIn, stepOut |
| `GetRuntimeCompletions` | Agent Experience | Runtime Debug Control | completion candidates from paused runtime |
| `GetStaticContext` | Agent Experience | Static Robot Intelligence | editor-time symbols and docs |
| `EvaluatePolicy` | Agent Experience | Governance | allow or deny requested action |
| `WriteAuditEntry` | Governance | Audit Sink | durable sanitized record |

## Domain Events

| Event | Producer | Consumer | Notes |
|---|---|---|---|
| `SessionSelected` | Session Orchestration | Agent Experience | includes transport mode and capability summary |
| `CapabilityProbeCompleted` | Session Orchestration | Agent Experience | includes explicit unsupported reasons |
| `ExecutionStateObserved` | Runtime Debug Control | Agent Experience | may update cache |
| `VariableSnapshotProduced` | Runtime Debug Control | Agent Experience | already redacted and bounded |
| `VariableMutationCompleted` | Runtime Debug Control | Governance | auditable mutation event |
| `VariableMutationRejected` | Runtime Debug Control | Agent Experience | includes policy or runtime reason |
| `KeywordExecutionCompleted` | Runtime Debug Control | Agent Experience | includes bounded logs and status |
| `SnippetExecutionCompleted` | Runtime Debug Control | Agent Experience | includes parse or runtime diagnostics |
| `PolicyEvaluated` | Governance | Agent Experience | allow or deny plus reason code |
| `AuditEntryWritten` | Governance | Agent Experience | best-effort confirmation |
| `SessionHealthChanged` | Session Orchestration | Agent Experience | running, paused, degraded, stopped |

## Existing Debug Events To Consume

The live integration must reuse existing debug events from the active session for cache updates, UX refresh, and correlation. In RobotCode bridge mode this includes custom Robot lifecycle and log events plus the `robot/sync` acknowledgement pattern for synced events.

## Event Rules

1. Cache updates must never block the debug event loop.
2. Synced events must be acknowledged within a bounded timeout budget.
3. Mutation and execution events must always produce audit attempts.
4. Read-only events may be sampled or deduplicated to reduce noise.
