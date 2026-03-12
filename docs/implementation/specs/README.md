# Chat Agent Spec Set

## Purpose

This directory contains the Phase `M0` through `M8` specifications for chat-agent integration.

These specs are intended to be code-facing and stable enough to drive:

- implementation sequencing
- test fixture design
- host-surface mappings
- compatibility review

## Files

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

## Phase Coverage

- `M0`: tool contracts, invocation planner, result envelopes, failure codes, policy matrix, token budgets
- `M1`: shared core architecture, execution pipeline, shared-core test fixtures
- `M2` and `M3`: VS Code LM tool surface
- `M4`: chat participant surface
- `M5` and `M6`: MCP surface
- `M7`: compatibility and hardening
- `M8`: production readiness

## Contract Rule

If implementation behavior, tests, and these specs disagree, these specs are the review starting point until a newer approved version supersedes them.
