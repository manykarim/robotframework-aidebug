# Chat Agents Execution Backlog

## Purpose

This backlog converts the chat-agent ADR/DDD set into deliverable implementation slices for `robotframework-aidebug`.

The target outcome is full chat-agent integration across:

1. VS Code-native agents such as GitHub Copilot
2. MCP-native agents such as Cline
3. optional human-driven orchestration through a dedicated chat participant

This document is implementation planning only. It does not claim that the listed items are already implemented.

## Planning Rules

- Build the shared application layer before host-specific surfaces.
- Ship read-only capabilities before mutating capabilities.
- Keep MCP `stdio` ahead of MCP `HTTP`.
- Treat safety, result shaping, audit, and observability as release gates, not cleanup work.
- Preserve one canonical tool contract set across LM tools, chat participant, and MCP.

## Milestones

### M0: Contract Freeze

Goal:
Freeze the canonical tool catalog, result envelopes, policy model, and compatibility assumptions.

Exit criteria:

- canonical tool catalog approved
- schema versioning rules approved
- confirmation and trust rules approved
- token budget classes approved
- failure codes approved

### M1: Shared Core

Goal:
Introduce the shared application layer used by all agent surfaces.

Exit criteria:

- invocation planner exists
- transport-neutral tool execution exists
- policy evaluation exists
- result shaping exists
- correlation ids and audit events exist

### M2: Native Read-Only LM Tools

Goal:
Enable Copilot-style inspection workflows safely.

Exit criteria:

- read-only LM tools are discoverable in VS Code
- tools work against live sessions through the shared core
- results are bounded and redacted
- no mutating behavior is exposed yet

### M3: Native Mutating LM Tools

Goal:
Enable controlled runtime mutation and execution through native agent mode.

Exit criteria:

- mutating LM tools require confirmation
- paused-session and control-mode checks are enforced
- audit trails exist for all mutating calls
- cancellation and timeout behavior are explicit

### M4: Chat Participant

Goal:
Add a first-class debugging participant for guided conversations.

Exit criteria:

- participant exists and is discoverable
- slash commands and follow-ups work
- participant routes through shared core and never bypasses policy

### M5: MCP `stdio`

Goal:
Provide a portable MCP surface for Cline-class clients.

Exit criteria:

- MCP server exposes canonical tool set over `stdio`
- tool metadata is aligned with safety classes
- prompts/instructions guide discover-then-act workflows
- protocol tests and at least one end-to-end client journey pass

### M6: MCP `HTTP` And VS Code Discovery

Goal:
Add optional network transport and turnkey discovery while preserving least privilege.

Exit criteria:

- HTTP transport is explicit opt-in only
- loopback-only default and authentication are enforced
- VS Code MCP server-definition provider works
- operational guidance exists

### M7: Compatibility And Hardening

Goal:
Stabilize across VS Code, Copilot, RobotCode, MCP framework, and client-version variance.

Exit criteria:

- compatibility matrix is defined and exercised
- fallback behavior is explicit and tested
- host-specific error mapping is complete
- release criteria are defined per surface

### M8: Production Readiness

Goal:
Finish operational hardening, documentation, and release automation.

Exit criteria:

- installation and usage docs are complete
- telemetry and diagnostics are usable
- benchmark and reliability gates are green
- CI covers all supported surfaces

## Issue Backlog

## Epic A: Shared Contracts And Core

### A1: Freeze canonical tool catalog

Scope:

- define tool ids
- classify read-only versus mutating tools
- define minimum and optional arguments
- define host visibility rules

Deliverables:

- schema document
- code-facing contract spec
- tool classification matrix

Acceptance criteria:

- every planned surface maps to the same tool ids
- each tool has one owning semantic definition
- deprecated or experimental tools are explicitly marked

Dependencies:

- none

### A2: Define result envelopes and failure codes

Scope:

- success payload envelope
- truncated payload envelope
- denial envelope
- retryable and non-retryable failures
- remediation hints

Deliverables:

- result schema
- failure code registry
- examples per failure class

Acceptance criteria:

- all surfaces can represent the same success and failure semantics
- envelopes include correlation id, truncation state, and policy outcome where relevant
- failure codes are stable and documented

Dependencies:

- A1

### A3: Define policy and confirmation matrix

Scope:

- `off`, `readOnly`, `fullControl`
- workspace trust rules
- paused-session requirement
- host confirmation mapping
- audit-required operations

Deliverables:

- policy matrix
- confirmation matrix
- denial reason taxonomy

Acceptance criteria:

- no mutating tool lacks a policy class
- policy decisions are independent of host UX implementation details
- denial reasons are machine-readable and documented

Dependencies:

- A1

### A4: Build invocation planner contract

Scope:

- normalize host requests into invocation plans
- transport selection inputs
- session targeting model
- idempotency guidance for agent retries

Deliverables:

- invocation plan schema
- planner algorithm design
- retry and idempotency notes

Acceptance criteria:

- same user intent produces the same plan across LM tools and MCP
- planner output is testable without host APIs
- retry semantics are explicit for mutating actions

Dependencies:

- A1
- A2
- A3

### A5: Define token budget and result-shaping policy

Scope:

- response size classes
- default item caps
- truncation behavior
- summary versus detail policy
- follow-up guidance strategy

Deliverables:

- token budget matrix
- shaping rules
- sample payloads and truncation examples

Acceptance criteria:

- each tool has a default response budget
- completions, audit, and variable snapshots have explicit caps
- truncation preserves correctness and user awareness

Dependencies:

- A2

### A6: Define observability contract

Scope:

- correlation ids
- surface metadata
- latency metrics
- policy decision logs
- audit event schema

Deliverables:

- structured logging schema
- metrics list
- event naming rules

Acceptance criteria:

- every tool invocation can be traced end to end
- logs support root-cause analysis across surfaces
- privacy-sensitive fields are identified for redaction

Dependencies:

- A2
- A3

## Epic B: Runtime Integration And Shared Application Layer

### B1: Implement surface-neutral application service boundary

Scope:

- request handler interfaces
- transport-neutral execution service
- result envelope builder
- policy hook points

Acceptance criteria:

- LM tools, participant, and MCP can all call the same application service
- host-specific types do not leak into the core layer
- unit tests cover orchestration paths

Dependencies:

- A1
- A2
- A3
- A4
- A5
- A6

### B2: Add session targeting and routing rules

Scope:

- active session selection
- explicit session addressing
- bridge versus embedded routing
- no-session fallback semantics

Acceptance criteria:

- routing decisions are deterministic and observable
- ambiguous-session cases return actionable failures
- fallback behavior is documented and tested

Dependencies:

- B1

### B3: Add cancellation, timeout, and concurrency rules

Scope:

- cancellation propagation from host
- default timeouts per tool class
- serial versus parallel runtime operations
- queued mutating operations

Acceptance criteria:

- long-running operations can be cancelled cleanly
- runtime state is not corrupted by overlapping mutations
- timeout failures are distinguishable from runtime failures

Dependencies:

- B1
- B2

### B4: Add result shaping and redaction implementation

Scope:

- bounded variable snapshots
- bounded audit and completion payloads
- secret redaction
- host-safe text shaping

Acceptance criteria:

- secret-like values do not reach agent-visible output unredacted
- bounded outputs meet default budget targets
- truncation metadata is preserved in the response envelope

Dependencies:

- B1
- A5

### B5: Add audit and telemetry pipeline

Scope:

- audit event emission
- tool invocation logs
- policy decision logging
- correlation ids across runtime and host surfaces

Acceptance criteria:

- mutating actions produce auditable events
- read-only failures are diagnosable without enabling debug builds
- test fixtures validate event shape stability

Dependencies:

- B1
- A6

## Epic C: VS Code Native LM Tools

### C1: Contribute read-only `languageModelTools`

Scope:

- `get_state`
- `get_variables_snapshot`
- `get_runtime_context`
- `get_capabilities`
- `get_audit_log`

Acceptance criteria:

- tools appear in supported VS Code agent environments
- inputs validate against canonical schemas
- outputs use bounded result envelopes

Dependencies:

- B1
- B2
- B4
- B5

### C2: Implement LM tool confirmations and invocation previews

Scope:

- `prepareInvocation()` for mutating tools
- progress and confirmation text
- denial messaging

Acceptance criteria:

- mutating tools never invoke silently when policy requires confirmation
- preview text is concise, accurate, and non-secret-bearing
- denial reasons map to the canonical taxonomy

Dependencies:

- C1
- A3

### C3: Contribute mutating `languageModelTools`

Scope:

- `set_variable`
- `execute_keyword`
- `execute_snippet`
- `control_execution`

Acceptance criteria:

- mutating tools are gated by control mode and paused-session checks
- each tool emits audit events
- timeout, cancellation, and truncation behavior are surfaced cleanly

Dependencies:

- C2
- B3
- B5

### C4: Add LM-tool integration tests

Scope:

- read-only workflows
- confirmation-required workflows
- denied workflows
- no-session and multi-session workflows

Acceptance criteria:

- at least one end-to-end native agent journey passes for each tool class
- negative tests exist for trust, mode, and paused-state violations
- tool registration is verified in CI

Dependencies:

- C1
- C2
- C3

## Epic D: Chat Participant

### D1: Define participant persona, routing, and slash commands

Scope:

- `@robotdebug`
- slash commands such as `/state`, `/variables`, `/recover`, `/run-keyword`
- participant detection guidance

Acceptance criteria:

- participant scope is clear and non-overlapping with generic chat
- slash commands map directly to canonical tools or planner flows
- prompts do not embed hidden policy exceptions

Dependencies:

- A1
- A3

### D2: Implement participant orchestration layer

Scope:

- participant request handler
- follow-up suggestions
- history-aware tool sequencing
- host-safe summaries

Acceptance criteria:

- participant uses shared application services instead of private shortcuts
- follow-ups are grounded in actual tool results
- failures are summarized with actionable next steps

Dependencies:

- D1
- B1
- B4

### D3: Add participant journey tests

Scope:

- guided inspection workflow
- guided recovery workflow
- denied mutation workflow

Acceptance criteria:

- participant can complete a full paused-session diagnostic path
- tool orchestration remains within policy bounds
- transcript fixtures are stable enough for regression testing

Dependencies:

- D2

## Epic E: MCP Surface

### E1: Define MCP tool catalog mapping

Scope:

- map canonical tools to MCP tools
- set `readOnlyHint` where supported
- define prompts/resources strategy
- define instruction templates

Acceptance criteria:

- MCP tool names and schemas are traceable to canonical contracts
- instruction templates emphasize inspect-first behavior
- read-only metadata is not incorrectly applied to mutating tools

Dependencies:

- A1
- A2
- A3

### E2: Implement MCP `stdio` server

Scope:

- stdio transport
- tool registration
- prompt/instruction publishing
- shared-core invocation

Acceptance criteria:

- a Cline-class client can discover and call the server over `stdio`
- server startup is deterministic and documented
- stdio transport does not require network permissions

Dependencies:

- E1
- B1
- B2
- B4
- B5

### E3: Add MCP protocol and client-journey tests

Scope:

- tool discovery
- read-only call flow
- confirmation-required mutation flow
- transport error flow

Acceptance criteria:

- protocol tests cover server lifecycle and malformed requests
- at least one realistic client journey passes end to end
- error codes align with canonical failures

Dependencies:

- E2

### E4: Implement optional MCP `HTTP` transport

Scope:

- loopback bind by default
- authentication token or equivalent local authorization
- explicit opt-in configuration
- operational limits

Acceptance criteria:

- HTTP is disabled unless explicitly enabled
- unauthenticated requests are rejected
- docs explain exposure risks and local-only defaults

Dependencies:

- E2
- A3
- B3

### E5: Add VS Code MCP server-definition provider

Scope:

- extension contribution for discovery
- workspace-aware resolution of server definitions
- install and diagnostics UX

Acceptance criteria:

- VS Code can discover the packaged MCP server when enabled
- provider output respects current workspace and trust state
- diagnostics point to misconfiguration clearly

Dependencies:

- E2

## Epic F: Compatibility, Performance, And Hardening

### F1: Build compatibility matrix and gating policy

Scope:

- VS Code versions
- Copilot agent support windows
- RobotCode compatibility assumptions
- MCP framework/runtime versions
- Python and Robot Framework versions

Acceptance criteria:

- support policy is documented per surface
- CI matrix reflects declared support windows
- unsupported combinations fail with actionable messaging

Dependencies:

- C1
- E2

### F2: Add performance regression suite

Scope:

- latency budgets per tool class
- payload-size budgets
- cancellation timing
- high-frequency inspection scenarios

Acceptance criteria:

- regression thresholds are defined and enforced in CI where feasible
- benchmark results are attributable to tool class and surface
- oversized payload regressions fail fast

Dependencies:

- B4
- C1
- E2

### F3: Add security and abuse-case test suite

Scope:

- secret redaction
- prompt injection resistance in tool inputs
- malformed request handling
- trust boundary enforcement
- HTTP exposure tests if enabled

Acceptance criteria:

- denial and sanitization behavior is test-covered
- secrets do not appear in user-visible or agent-visible artifacts
- malformed inputs cannot bypass confirmation or policy checks

Dependencies:

- B4
- C3
- E4

### F4: Add reliability and recovery tests

Scope:

- extension host restart behavior
- debug session termination during invocation
- MCP server restart behavior
- partial transport failure handling

Acceptance criteria:

- recovery paths are deterministic
- errors preserve enough context for retry decisions
- no hung operations remain after session loss

Dependencies:

- B2
- B3
- C4
- E3

### F5: Finish release automation and operational docs

Scope:

- packaging docs
- local install docs
- troubleshooting docs
- CI/release flow for VSIX and Python package

Acceptance criteria:

- users can install the native extension and MCP server without marketplace dependency
- docs cover Copilot-style and MCP-style usage separately
- release artifacts are reproducible

Dependencies:

- C4
- E3
- F1

## Recommended Issue Order

1. A1
2. A2
3. A3
4. A4
5. A5
6. A6
7. B1
8. B2
9. B4
10. B5
11. C1
12. C2
13. C3
14. C4
15. D1
16. D2
17. D3
18. E1
19. E2
20. E3
21. B3
22. E4
23. E5
24. F1
25. F2
26. F3
27. F4
28. F5

## Release Gates

### Gate 1: Native Read-Only Release Candidate

Required:

- A1-A6
- B1-B2
- B4-B5
- C1
- C4 read-only paths

### Gate 2: Native Full-Control Release Candidate

Required:

- C2-C3
- security and audit validation for mutating tools
- performance budget validation for mutating workflows

### Gate 3: MCP Portable Release Candidate

Required:

- E1-E3
- C-surface parity review for shared tools
- MCP protocol conformance validation

### Gate 4: Full Production Release

Required:

- E4-E5 if HTTP/discovery is advertised
- F1-F5
- installation, upgrade, rollback, and troubleshooting docs complete

## Definition Of Done

An issue is done only when:

1. implementation matches the canonical contracts
2. automated tests cover the happy path and at least one relevant failure path
3. observability and audit effects are present where required
4. user-facing docs are updated if behavior changed
5. compatibility and security implications are recorded

## Open Risks To Track During Execution

1. VS Code LM tool APIs and MCP host behavior may evolve faster than the extension release cadence.
2. Copilot-style native agent support and MCP-style portability will not expose identical UX guarantees.
3. HTTP MCP transport can easily expand the attack surface if enabled casually.
4. Token growth from variable snapshots, context dumps, or audit records can degrade chat usefulness if shaping discipline slips.
5. Bridge-mode runtime variance across RobotCode versions must be treated as a real compatibility boundary, not an implementation detail.
