# ADR-004: Deliver Incrementally With Read-Only First And Experiment-Backed Design

- Status: Accepted
- Date: 2026-03-08

## Context

At the time of this decision, the repo did not yet contain the RobotCode implementation. The design work therefore had to avoid two failure modes:

1. pretending uncertain Robot Framework behavior is settled,
2. overcommitting to a large implementation slice before the lowest-risk path is proven.

## Decision

Delivery will proceed in phases:

1. documentation and validation experiments,
2. read-only tooling and execution-state snapshots,
3. structured mutation and keyword execution,
4. optional external bridge after the in-editor path is stable.

The project will use `uv` to manage the Python environment and lock the experiment dependencies used for validation.

## Verified Inputs Used For This ADR

The design package in this repository was validated against:

- Python `3.13.11`
- `uv 0.9.26`
- `robotframework 7.4.2`

The detailed findings are captured in [docs/implementation/experiments.md](/home/many/workspace/robotframework-aidebug/docs/implementation/experiments.md).

## Rationale

1. The read-only feature set provides immediate value with lower risk.
2. Experiment-backed design lets future implementation work start from confirmed semantics.
3. `uv.lock` makes the validation environment reproducible.

## Consequences

### Positive

- Lower implementation risk.
- Better documentation quality.
- Easier review because assumptions are explicit.

### Negative

- Some design documents may need adjustment when integrated into the actual RobotCode repo.
- The final package boundaries may shift when mapped onto the real monorepo layout.
