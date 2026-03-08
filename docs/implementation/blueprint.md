# Implementation Blueprint

## Scope

This document describes the implemented local reference package and the intended shape of a future production mapping into a RobotCode-style repository.

## Proposed Module Layout

The actual paths will depend on the target RobotCode monorepo, but the logical structure should look like this:

```text
packages/
  vscode-extension/
    src/
      agentDebug/
        tools/
          getStateTool.ts
          getStackTool.ts
          getScopesTool.ts
          getVariablesTool.ts
          setVariableTool.ts
          executeKeywordTool.ts
          executeSnippetTool.ts
          controlExecutionTool.ts
        sessionRouter.ts
        policyGate.ts
        stateCache.ts
        auditSink.ts
        schemas.ts
        settings.ts
  debugger/
    src/robotcode/debugger/
      agent_api.py
      policy.py
      snapshots.py
      structured_execution.py
      server.py
      debugger.py
```

## Application Layers

### Extension Layer

Responsibilities:

- register tools,
- resolve the active RobotCode debug session,
- present concise tool outputs,
- gate availability using settings and trust state,
- maintain a small cache of recent debug events,
- write audit logs for user-visible tooling activity.

### Debug Server Layer

Responsibilities:

- validate paused-only and read/write constraints,
- implement custom DAP request handlers,
- convert structured requests into Robot Framework operations,
- enforce output limits and redaction before responding,
- report structured failures.

## Request Schemas

### `robot/getExecutionState`

```json
{
  "includeStack": true,
  "includeScopes": false,
  "maxLogLines": 20
}
```

### `robot/getVariablesSnapshot`

```json
{
  "frameId": 41,
  "scopes": ["local", "test"],
  "maxItems": 50,
  "redactPatterns": ["TOKEN", "PASSWORD", "SECRET"]
}
```

### `robot/executeKeyword`

```json
{
  "keyword": "Log Variables",
  "args": [],
  "assign": [],
  "frameId": 41,
  "timeoutSec": 5,
  "captureLog": true
}
```

### `robot/executeSnippet`

```json
{
  "snippet": "IF    $status == 'FAILED'\n    Log    Investigating\nEND",
  "frameId": 41,
  "timeoutSec": 5
}
```

## Planned Delivery Slices

### Slice 1: Read-Only Tools

Deliver:

- get state,
- get stack,
- get scopes,
- get variables,
- get variables snapshot,
- settings and trust gating,
- audit trail for reads.

Do not deliver yet:

- variable mutation,
- keyword execution,
- snippet execution,
- external gateway.

### Slice 2: Controlled Writes And Executions

Deliver:

- set variable,
- execute keyword,
- execute snippet,
- rate limiting,
- stricter audit entries,
- higher-confidence redaction tests.

### Slice 3: Optional External Bridge

Deliver only if needed:

- local-only HTTP or MCP bridge,
- authentication or local binding constraints,
- parity with extension tool contracts.

## Test Strategy

### Python

- unit tests for each custom request schema and handler,
- unit tests for paused-only enforcement,
- tests for snippet envelope parsing,
- tests for redaction and truncation,
- regression tests for existing `evaluate` and `setVariable` behavior.

### VS Code Extension

- tool registration tests,
- enablement and workspace trust tests,
- session routing tests,
- mock `customRequest()` contract tests,
- audit logging tests.

### End-To-End

- launch a small Robot suite,
- pause on breakpoint,
- inspect state and variables,
- mutate a variable,
- execute a diagnostic keyword,
- resume and verify outcome.

## Non-Goals For The First Production Iteration

- autonomous long-running agent workflows,
- direct runtime manipulation outside DAP,
- rich notebook-like execution history,
- external bridge enabled by default.
