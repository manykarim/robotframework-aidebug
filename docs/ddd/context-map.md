# Context Map

```mermaid
flowchart LR
  subgraph AI[Agent Runtime]
    AGENT[LLM / Agent Mode]
  end

  subgraph EXT[VS Code Extension Host]
    TOOLS[Agent Tools]
    ROUTER[Session Router]
    CACHE[State Cache]
    POLICY[Policy Gate]
    AUDIT[Audit Sink]
  end

  subgraph DAP[RobotCode DAP Path]
    LAUNCHER[Debug Launcher]
    SERVER[Debug Server]
  end

  subgraph RF[Robot Framework Runtime]
    EXEC[Execution Engine]
    VARS[Variable Store]
    LISTENERS[Listeners v2 and v3]
  end

  AGENT --> TOOLS
  TOOLS --> POLICY
  POLICY --> ROUTER
  ROUTER --> LAUNCHER
  LAUNCHER --> SERVER
  SERVER --> EXEC
  EXEC --> VARS
  EXEC --> LISTENERS
  SERVER --> AUDIT
  POLICY --> AUDIT
  SERVER --> CACHE
  CACHE --> TOOLS
```

## Upstream And Downstream Relationships

| Context | Relationship | Notes |
|---|---|---|
| Agent Interaction -> Debug Session Orchestration | Customer/Supplier | tools depend on stable routing and request semantics |
| Debug Session Orchestration -> Robot Execution Control | Customer/Supplier | extension requests rely on server-side behavior |
| Governance -> Agent Interaction | Conformist | tool availability conforms to policy decisions |
| Governance -> Robot Execution Control | Conformist | execution requests must pass policy checks server-side too |
| Robot Execution Control -> Robot Framework Runtime | Anti-corruption layer | RobotCode translates domain requests into Robot Framework semantics |

## External Systems

### VS Code Debug Platform

Provides session lifecycle, debug custom events, and `customRequest()` transport.

### Robot Framework Runtime

Provides parsing, execution, listeners, variable replacement, and expression evaluation semantics.

### Optional HTTP Or MCP Gateway

This is an external downstream consumer of the same application layer. It is not part of the core model and should remain disabled by default.
