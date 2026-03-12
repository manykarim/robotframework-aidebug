# Chat Agents Context Map

```mermaid
flowchart LR
  subgraph HOST[VS Code / MCP Hosts]
    COPILOT[Copilot Agent Mode]
    PARTICIPANT[Chat Participant]
    CLINE[Cline / MCP Clients]
  end

  subgraph SURFACES[Agent Surfaces]
    LMTOOLS[VS Code LM Tools]
    CHATP[Participant Orchestrator]
    MCPS[MCP Server]
  end

  subgraph APP[Shared Application Layer]
    ROUTER[Session Router]
    ACTIONS[Invocation Planner]
    POL[Policy + Confirmation]
    AUDIT[Audit]
    SHAPE[Result Shaping + Token Budgeting]
  end

  subgraph RUNTIME[Debug Runtime]
    BRIDGE[RobotCode Bridge]
    EMBED[Embedded Debug Adapter]
    STATIC[Static Namespace Context]
  end

  COPILOT --> LMTOOLS
  PARTICIPANT --> CHATP
  CLINE --> MCPS

  LMTOOLS --> ACTIONS
  CHATP --> ACTIONS
  MCPS --> ACTIONS

  ACTIONS --> ROUTER
  ACTIONS --> POL
  ROUTER --> BRIDGE
  ROUTER --> EMBED
  ACTIONS --> STATIC
  POL --> AUDIT
  ACTIONS --> SHAPE
  SHAPE --> LMTOOLS
  SHAPE --> CHATP
  SHAPE --> MCPS
```

## Boundary Rules

1. Agent surfaces must not embed runtime business rules directly.
2. The chat participant may orchestrate tools, but must not bypass policy.
3. MCP-specific concerns such as prompts or resources must not leak into the core debug domain.
4. Result shaping is a first-class application concern because agents are token-constrained consumers.
