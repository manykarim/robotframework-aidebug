# Architecture Blueprint

## Scope

This blueprint describes the target implementation structure without committing to immediate code changes.

## Primary Architecture

```text
vscode-extension/
  src/
    agentDebug/
      tools/
      sessionRouter/
      transports/
        bridgeTransport/
        embeddedTransport/
      policy/
      audit/
      cache/
      staticContext/
      schemas/
      telemetry/
python-package/
  src/robotframework_aidebug/
    bridge/
    adapter/
    runtime/
    policy/
    snapshots/
    execution/
    observability/
    compatibility/
```

## Key Components

### Session Router

Responsibilities:

- find the active session
- select `bridge` or `embedded` transport
- keep capability metadata current
- expose a transport-neutral command API

### Bridge Transport

Responsibilities:

- call VS Code debug-session requests against RobotCode
- normalize existing DAP requests into domain commands
- handle custom RobotCode debug events
- acknowledge synced events when required

### Embedded Transport

Responsibilities:

- own the `robotframework-aidebug` debug type
- launch and communicate with the backend adapter
- expose the same domain commands as bridge mode

### Governance Layer

Responsibilities:

- evaluate control mode
- enforce workspace trust
- redact and truncate responses
- apply rate limits and timeout budgets
- write audit entries

### Static Context Layer

Responsibilities:

- provide editor-time keyword and variable context
- integrate with source-analysis capabilities separately from the paused runtime
- clearly label static versus runtime answers

## Cross-Cutting Rules

1. All commands pass through policy and correlation-id assignment.
2. All tool output is bounded.
3. All transport errors are translated into domain errors with actionable messages.
4. The extension UI does not construct raw DAP payloads directly.
