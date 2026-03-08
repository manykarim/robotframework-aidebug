# Commands And Events

## Commands

| Command | Origin | Target | Purpose |
|---|---|---|---|
| `GetExecutionState` | Agent Tool | Debug Server | compact runtime snapshot |
| `GetStack` | Agent Tool | Debug Server | current stack frames |
| `GetScopes` | Agent Tool | Debug Server | scopes for one frame |
| `GetVariables` | Agent Tool | Debug Server | tree navigation over variables |
| `GetVariablesSnapshot` | Agent Tool | Debug Server | bounded scoped snapshot |
| `SetVariable` | Agent Tool | Debug Server | mutate one variable |
| `ExecuteKeyword` | Agent Tool | Debug Server | run one keyword in paused context |
| `ExecuteSnippet` | Agent Tool | Debug Server | run a wrapped multi-line Robot body |
| `ControlExecution` | Agent Tool | Debug Server | continue, pause, next, stepIn, stepOut |

## Domain Events

| Event | Producer | Consumer | Notes |
|---|---|---|---|
| `AgentToolInvoked` | Agent Interaction | Governance | created before dispatch |
| `PolicyEvaluated` | Governance | Agent Interaction | allow/deny plus reason |
| `ExecutionStateRead` | Robot Execution Control | Agent Interaction | read-side event for caching |
| `VariableSnapshotProduced` | Robot Execution Control | Agent Interaction | redacted and bounded |
| `VariableMutationRejected` | Robot Execution Control | Agent Interaction | paused-only or resolution failure |
| `KeywordExecutionCompleted` | Robot Execution Control | Agent Interaction | includes PASS or FAIL |
| `SnippetExecutionCompleted` | Robot Execution Control | Agent Interaction | includes parse or runtime error |
| `AgentActionAudited` | Governance | Audit Sink | durable record |

## Existing Debug Events To Reuse

RobotCode already emits custom debug events such as suite/test lifecycle and log output. The agent design should not replace them. It should consume them for cache-building and summarization.

## Event Handling Rules

1. Synced RobotCode events must still receive `robot/sync` acknowledgements promptly.
2. Agent caching must never block the debug event loop.
3. Audit events must be emitted for writes and executions even if the underlying operation fails.
4. Read events may be sampled or deduplicated to reduce noise.
