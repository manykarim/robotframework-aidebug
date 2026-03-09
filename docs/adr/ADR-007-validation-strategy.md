# ADR-007: Validate With Experiments, Contract Tests, And Full E2E Journeys

- Status: Accepted
- Date: 2026-03-08

## Context

The design depends on three classes of assumptions:

1. Robot Framework parser and runtime behavior
2. VS Code and DAP integration behavior
3. RobotCode interoperability behavior

A design-only document is not enough unless those assumptions are verified continuously.

## Decision

Every phase must be backed by:

1. focused `uv run` experiments for Robot Framework semantics
2. transport contract tests at the extension and backend boundaries
3. end-to-end user journey tests against live debug sessions
4. benchmark and failure-mode validation for operational budgets

## Consequences

- The docs and tests must evolve together.
- Experimental findings become input to ADR revisions.
- Rollout gates must include functional, non-functional, and compatibility checks.
