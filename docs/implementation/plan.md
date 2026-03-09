# Implementation Plan

## Goal

Deliver `robotframework-aidebug` as a standalone product that fully supports AI-assisted live Robot Framework debugging in VS Code with clear operational safety, strong test coverage, and a path from RobotCode bridge integration to full debugger independence.

## Success Criteria

1. A user can inspect a live paused Robot Framework session from the extension.
2. A user can inspect and mutate variables under explicit policy control.
3. A user can execute keywords and multi-line snippets while paused.
4. The product works without Marketplace installation assumptions.
5. Performance, reliability, and security budgets are validated continuously.

## Scope Boundaries

### In Scope

- VS Code extension-side tooling and session routing
- RobotCode bridge integration
- future embedded debug type plan
- runtime and static namespace integration
- security, policy, redaction, audit, observability
- contract, e2e, compatibility, and benchmark testing

### Out Of Scope For The First Delivery Slice

- autonomous long-running agents
- remote multi-user debug control
- default-on external HTTP or MCP gateway
- greenfield Robot Framework debug adapter implementation

## Workstreams

### Workstream 1: Foundation And Contracts

Deliverables:

1. transport-neutral domain command contracts
2. capability model and session health model
3. extension settings and control modes
4. correlation-id and audit schema
5. compatibility matrix for extension, backend, RobotCode, and Robot Framework versions

Acceptance:

- contracts reviewed and frozen for bridge v1
- failure codes and denial reasons documented

### Workstream 2: Bridge Transport

Deliverables:

1. active `robotcode` session detection
2. capability probing against standard DAP requests
3. mapping layer for state, scopes, variables, evaluate, setVariable, completions, and stepping
4. custom-event handling with `robot/sync` acknowledgement support
5. degradation handling for unsupported versions or capabilities

Acceptance:

- no direct private imports from the RobotCode extension
- no event-loop blocking during custom-event processing
- live session actions produce precise unsupported reasons when unavailable

### Workstream 3: Agent Tool Layer

Deliverables:

1. read-only tools
2. full-control tools for mutation and execution
3. clear output formatting and bounded summaries
4. capability and policy-aware UX copy

Acceptance:

- tools never emit raw unbounded payloads
- execution requests are normalized before transport dispatch

### Workstream 4: Static Context Integration

Deliverables:

1. editor-time keyword and symbol context
2. separation between runtime namespace and static namespace outputs
3. contextual help for missing runtime capabilities

Acceptance:

- runtime answers are labeled as runtime-derived
- source-analysis answers are labeled as static-derived

### Workstream 5: Embedded Mode Design And Preparation

Deliverables:

1. debug type contribution design
2. adapter launch model
3. upstream Python package dependency strategy
4. structured `robot/*` request schema design
5. release and compatibility policy for embedded mode

Acceptance:

- no greenfield adapter work started before bridge-mode success criteria are met
- structured request schemas are transport-neutral and versioned

### Workstream 6: Security And Governance

Deliverables:

1. mode gating and workspace trust enforcement
2. redaction engine and payload bounds
3. rate limiting and timeout policy
4. audit sink and retention policy
5. threat-model test cases

Acceptance:

- fail-closed behavior verified
- secrets never appear in persisted raw form in audit fixtures

### Workstream 7: Reliability And Observability

Deliverables:

1. structured logs and metrics
2. timeout and retry policy
3. session health transitions and degraded-mode UX
4. benchmark harness at the transport boundary

Acceptance:

- latency budgets measured in CI or dedicated validation runs
- degradation scenarios surfaced to the user clearly

### Workstream 8: Testing And Validation

Deliverables:

1. focused `uv run` Robot Framework experiments
2. unit and contract tests
3. extension integration tests
4. full e2e journey tests against live paused sessions
5. compatibility test matrix

Acceptance:

- every supported user journey has an e2e test
- failure injection covers timeouts, unsupported capabilities, version mismatch, and policy denials

## Phased Roadmap

### Phase 0: Architecture Freeze

1. approve ADR set
2. finalize command and event contracts
3. freeze non-functional budgets

### Phase 1: Read-Only Bridge

1. detect live RobotCode sessions
2. read state, stack, scopes, variables, recent output
3. provide runtime completions where available
4. add caching, audit for reads, and health reporting

Exit criteria:

- reliable paused-session diagnosis
- stable session routing
- read-only latency within budget

### Phase 2: Controlled Bridge Execution

1. variable mutation
2. keyword execution
3. snippet execution with wrapper validation
4. stronger rate limiting and execution audit

Exit criteria:

- mutation and execution guarded by policy
- parse/runtime failures rendered clearly
- full-control e2e journeys passing

### Phase 3: Structured Request Upgrade

1. add or negotiate structured `robot/*` requests where practical
2. simplify bridge client wrappers
3. strengthen telemetry and compatibility checks

Exit criteria:

- reduced dependence on raw `evaluate` formatting
- stable transport-neutral schemas for embedded mode reuse

### Phase 4: Embedded Mode Delivery

1. contribute `robotframework-aidebug` debug type
2. launch own adapter/backend
3. reuse upstream Python packages under explicit compatibility policy
4. preserve the same tool contracts and governance behavior

Exit criteria:

- independent live debug flow without RobotCode extension required
- compatibility and upgrade documentation complete

## Performance Plan

1. cache capability probes per session lifecycle
2. cache bounded runtime snapshots for short intervals only
3. cache parsed snippet envelopes with invalidation on content hash
4. benchmark hot paths separately from full transport paths
5. treat event-handling latency as a first-class metric

## Stability And Reliability Plan

1. isolate transport exceptions from tool rendering
2. use explicit timeout budgets on every transport call
3. retry read-only transient failures at most once
4. never auto-retry writes or execution
5. maintain a degraded state with explicit remediation guidance

## Security Plan

1. enforce `off`, `readOnly`, `fullControl`
2. require workspace trust and explicit enablement
3. redact secrets before output, logs, metrics, and audit
4. use bounded payload sizes everywhere
5. disable external network surfaces by default

## Documentation Plan

1. keep ADRs current with implementation reality
2. update experiments when Robot Framework assumptions change
3. publish compatibility matrix and install modes in user-facing docs
4. document exact failure codes and remediation paths
