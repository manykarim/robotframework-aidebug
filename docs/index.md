# Architecture Index

## Purpose

This documentation set turns [docs/research.md](/home/many/workspace/robotframework-aidebug/docs/research.md) into an implementation-ready architecture for `robotframework-aidebug`.

The target product is a standalone package and VS Code extension that enable AI-assisted Robot Framework debugging without coupling the product identity to RobotCode. The design supports two runtime modes:

1. `Bridge Mode`
   Integrate with an active RobotCode debug session through stable VS Code debug APIs and existing DAP requests.
2. `Embedded Mode`
   Ship an independent `robotframework-aidebug` debug type backed by Python packages that reuse RobotCode's debugger and language-server runtime components.

The immediate recommendation is to build `Bridge Mode` first and keep `Embedded Mode` as the long-term independence path.

## Verified Assumptions

The following assumptions were re-validated locally on March 8, 2026 with `uv run` and Robot Framework `7.4.2`:

1. Raw Robot body fragments such as `Log    hi` and `IF    True` parse into `ImplicitCommentSection`, not executable test bodies.
2. Wrapping the same content in a synthetic `*** Test Cases ***` envelope produces runnable `TestCaseSection` models.
3. Variable replacement and expression evaluation use different syntax:
   - `replace_scalar()` and `replace_string()` accept `${VAR}`.
   - `evaluate_expression()` accepts `$VAR` for expression semantics.
4. The local reference benchmark remains comfortably below interactive latency targets for state reads, variable snapshots, variable sets, and cached snippet execution.

Evidence is captured in [docs/implementation/experiments.md](/home/many/workspace/robotframework-aidebug/docs/implementation/experiments.md).

## ADRs

- [ADR-001: Adopt Dual-Mode Integration With Bridge First](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-001-vscode-agent-debug-tools.md)
- [ADR-002: Keep The Product Standalone And Avoid A Hard Extension Dependency](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-002-structured-custom-dap-requests.md)
- [ADR-003: Use Existing DAP Semantics First And Add Structured Requests Later](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-003-safety-redaction-audit.md)
- [ADR-004: Enforce Security, Safety, Audit, And Operational Guardrails](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-004-phased-delivery-experiment-led.md)
- [ADR-005: Define Reliability, Performance, And Observability Budgets](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-005-reliability-performance-observability.md)
- [ADR-006: Distribute As Separate Installable Packages With Marketplace Readiness](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-006-standalone-packaging-and-distribution.md)
- [ADR-007: Validate With Experiments, Contract Tests, And Full E2E Journeys](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-007-validation-strategy.md)

## DDD

- [DDD Overview](/home/many/workspace/robotframework-aidebug/docs/ddd/README.md)
- [Context Map](/home/many/workspace/robotframework-aidebug/docs/ddd/context-map.md)
- [Domain Model](/home/many/workspace/robotframework-aidebug/docs/ddd/domain-model.md)
- [Use Cases](/home/many/workspace/robotframework-aidebug/docs/ddd/use-cases.md)
- [Commands And Events](/home/many/workspace/robotframework-aidebug/docs/ddd/commands-and-events.md)
- [Modes And Deployment](/home/many/workspace/robotframework-aidebug/docs/ddd/modes-and-deployment.md)
- [Non-Functional Requirements](/home/many/workspace/robotframework-aidebug/docs/ddd/non-functional-requirements.md)

## Implementation Planning

- [Architecture Blueprint](/home/many/workspace/robotframework-aidebug/docs/implementation/blueprint.md)
- [Implementation Plan](/home/many/workspace/robotframework-aidebug/docs/implementation/plan.md)
- [Examples And User Journeys](/home/many/workspace/robotframework-aidebug/docs/implementation/examples.md)
- [Experiment Results](/home/many/workspace/robotframework-aidebug/docs/implementation/experiments.md)
- [Test Strategy](/home/many/workspace/robotframework-aidebug/docs/implementation/test-strategy.md)
- [Risk Register](/home/many/workspace/robotframework-aidebug/docs/implementation/risk-register.md)
- [Validation Baseline](/home/many/workspace/robotframework-aidebug/docs/implementation/validation.md)
- [Benchmark Baseline](/home/many/workspace/robotframework-aidebug/docs/implementation/benchmark-results.md)
- [AI Debug Cookbook](/home/many/workspace/robotframework-aidebug/docs/implementation/ai-debug-cookbook.md)
- [AI Debug Session Retrospective 2026-03-09](/home/many/workspace/robotframework-aidebug/docs/implementation/ai-debug-session-retrospective-2026-03-09.md)
- [AI Debug Maintainer Report 2026-03-09 Selector Suite](/home/many/workspace/robotframework-aidebug/docs/implementation/ai-debug-maintainer-report-2026-03-09-selector-suite.md)


## Chat Agents

- [ADR-008: Adopt Dual-Surface Chat Agent Integration](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-008-chat-agent-dual-surface.md)
- [ADR-009: Make VS Code Language Model Tools The Primary Native Agent Interface](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-009-vscode-language-model-tools-first.md)
- [ADR-010: Provide MCP Interoperability For Non-Native Agent Clients](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-010-mcp-interoperability-surface.md)
- [ADR-011: Add A Specialized Chat Participant As An Optional Orchestration Layer](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-011-chat-participant-orchestration.md)
- [ADR-012: Apply Governance, Confirmation, And Least-Privilege Rules Across All Agent Surfaces](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-012-agent-governance-and-safety.md)
- [ADR-013: Budget For Token Usage, Interactive Latency, And Non-Blocking Execution](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-013-agent-performance-and-token-budgets.md)
- [ADR-014: Manage Compatibility And Release Strategy By Client Surface](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-014-chat-agent-compatibility-and-release-strategy.md)
- [Chat Agents Overview](/home/many/workspace/robotframework-aidebug/docs/ddd/chat-agents-overview.md)
- [Chat Agents Context Map](/home/many/workspace/robotframework-aidebug/docs/ddd/chat-agents-context-map.md)
- [Chat Agents Domain Model](/home/many/workspace/robotframework-aidebug/docs/ddd/chat-agents-domain-model.md)
- [Chat Agents Use Cases](/home/many/workspace/robotframework-aidebug/docs/ddd/chat-agents-use-cases.md)
- [Chat Agents Commands And Events](/home/many/workspace/robotframework-aidebug/docs/ddd/chat-agents-commands-and-events.md)
- [Chat Agent Experiment Results](/home/many/workspace/robotframework-aidebug/docs/implementation/chat-agents-experiments.md)
- [Chat Agents Implementation Plan](/home/many/workspace/robotframework-aidebug/docs/implementation/chat-agents-plan.md)
- [Chat Agents Execution Backlog](/home/many/workspace/robotframework-aidebug/docs/implementation/chat-agents-backlog.md)
- [Chat Agent Spec Set](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/README.md)
- [Tool Contracts](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-tool-contracts.md)
- [Invocation Planner Contract](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-invocation-plans.md)
- [Shared Core Architecture](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-shared-core-architecture.md)
- [Execution Pipeline](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-execution-pipeline.md)
- [Result Envelopes](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-result-envelopes.md)
- [Failure Codes](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-failure-codes.md)
- [Policy Matrix](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-policy-matrix.md)
- [Token Budgets](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-token-budgets.md)
- [Shared Core Test Fixtures](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-test-fixtures.md)
- [VS Code LM Tool Surface](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-vscode-lm-tools.md)
- [Chat Participant Surface](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-chat-participant.md)
- [MCP Surface](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-mcp-surface.md)
- [Compatibility And Hardening](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-compatibility-hardening.md)
- [Production Readiness](/home/many/workspace/robotframework-aidebug/docs/implementation/specs/chat-agents-production-readiness.md)

## Recommended Reading Order

1. [docs/research.md](/home/many/workspace/robotframework-aidebug/docs/research.md)
2. All ADRs in order
3. DDD set
4. [docs/implementation/blueprint.md](/home/many/workspace/robotframework-aidebug/docs/implementation/blueprint.md)
5. [docs/implementation/plan.md](/home/many/workspace/robotframework-aidebug/docs/implementation/plan.md)
6. [docs/implementation/test-strategy.md](/home/many/workspace/robotframework-aidebug/docs/implementation/test-strategy.md)
7. [docs/implementation/risk-register.md](/home/many/workspace/robotframework-aidebug/docs/implementation/risk-register.md)
