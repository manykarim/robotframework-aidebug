# Context Map

```mermaid
flowchart LR
  subgraph AGENT[Agent Runtime]
    LLM[LLM / Agent Mode]
  end

  subgraph EXT[VS Code Extension]
    TOOLS[Agent Tools]
    ROUTER[Session Router]
    CACHE[Runtime Cache]
    GOV[Policy Gate + Audit]
    STATIC[Static Robot Intelligence]
  end

  subgraph BRIDGE[Bridge Mode]
    VSD[VS Code Debug API]
    RCS[RobotCode Session]
  end

  subgraph EMBED[Embedded Mode]
    ADBG[robotframework-aidebug Debug Adapter]
    PY[Python Runtime Components]
  end

  subgraph RF[Robot Framework Runtime]
    EXEC[Execution Engine]
    VARS[Variable Store]
    LISTEN[Listeners / Events]
  end

  LLM --> TOOLS
  TOOLS --> GOV
  GOV --> ROUTER
  TOOLS --> STATIC
  ROUTER --> VSD
  VSD --> RCS
  ROUTER --> ADBG
  RCS --> EXEC
  ADBG --> EXEC
  EXEC --> VARS
  EXEC --> LISTEN
  LISTEN --> CACHE
  CACHE --> TOOLS
  GOV --> TOOLS
```

## Relationships

| Upstream | Downstream | Relationship | Why |
|---|---|---|---|
| Agent Experience | Session Orchestration | Customer/Supplier | tools need stable transport-neutral operations |
| Session Orchestration | Runtime Debug Control | Customer/Supplier | live data and commands are downstream runtime concerns |
| Agent Experience | Static Robot Intelligence | Customer/Supplier | grounding and suggestions need editor-time context |
| Governance | Agent Experience | Conformist | tool availability must reflect policy results |
| Governance | Runtime Debug Control | Conformist | runtime execution must obey the same policy rules |
| Packaging And Distribution | all contexts | Published Language | install, compatibility, and version rules affect every boundary |

## Key Boundary Decisions

1. `Session Orchestration` must not know whether the runtime is bridged or embedded beyond capability metadata.
2. `Static Robot Intelligence` and `Runtime Debug Control` are separate contexts because one is paused-runtime truth and the other is source-analysis truth.
3. `Governance` is cross-cutting but not optional. It is not a utility layer.
