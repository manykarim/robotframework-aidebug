# Chat Agents Shared Core Test Fixtures

## Purpose

This document defines the `M1` test fixture plan for the shared application layer.

The goal is to make early implementation testable without depending on full VS Code host orchestration or a full external MCP client.

## Fixture Strategy

Build the test pyramid from the core outward:

1. planner and policy unit fixtures
2. shared-core orchestration fixtures with fake ports
3. host-adapter integration fixtures
4. end-to-end journey fixtures later in `M2+`

## Fixture Families

## F1: Planner Fixtures

Purpose:

- validate canonical request normalization
- validate default budgets and queue classes
- validate session selector logic

Cases:

- valid read-only LM request
- valid mutating MCP request
- invalid tool id
- invalid scope
- explicit session id versus active session

Expected assertions:

- canonical tool id
- normalized arguments
- correct budget class
- correct queue class
- correct confirmation flag

## F2: Policy Fixtures

Purpose:

- validate `off`, `readOnly`, and `fullControl`
- validate trust gating
- validate paused-session requirements

Cases:

- read-only tool in `readOnly`
- mutating tool in `readOnly`
- execution tool in untrusted workspace
- control tool requiring confirmation

Expected assertions:

- allow/deny/confirm outcome
- correct denial code
- no runtime port called on denial

## F3: Session Resolution Fixtures

Purpose:

- validate active-session targeting
- validate explicit session targeting
- validate ambiguous session failure
- validate frame resolution rules

Cases:

- one active bridge session
- one active embedded session
- two active sessions of different types
- frame-required tool without frame

Expected assertions:

- resolved session id
- resolved frame id
- correct failure when ambiguous or missing

## F4: Routing Fixtures

Purpose:

- validate transport selection rules
- validate capability fallbacks

Cases:

- bridge preferred and available
- embedded preferred and available
- bridge unavailable, embedded available
- fallback invalid for requested semantics

Expected assertions:

- selected adapter
- correct `TRANSPORT_UNAVAILABLE` or `CAPABILITY_UNAVAILABLE` when needed

## F5: Execution Fixtures

Purpose:

- validate runtime-port invocation through shared core
- validate timeout and cancellation propagation

Cases:

- successful read-only call
- successful mutating call
- runtime timeout
- runtime cancellation
- queued mutation rejected

Expected assertions:

- correct port method called
- canonical failure code on timeout/cancel
- no double invocation

## F6: Result-Shaping Fixtures

Purpose:

- validate truncation and redaction behavior
- validate partial-envelope generation

Cases:

- oversized completion payload
- oversized variable snapshot
- secret-like variable value
- shaping failure path

Expected assertions:

- `partial` envelope when bounded output is returned
- `truncated=true` when limits are hit
- `redacted=true` when masking occurs
- canonical failure when shaping itself fails

## F7: Audit And Diagnostics Fixtures

Purpose:

- validate audit emission and correlation ids
- validate metrics emission points

Cases:

- successful mutation
- denied mutation
- failed execution
- read-only success

Expected assertions:

- audit emitted where required
- correlation id present everywhere
- metrics tagged by tool and surface

## Fake Port Set

`M1` implementation should start with fake adapters for:

- `FakeSessionQueryPort`
- `FakeVariablePort`
- `FakeContextPort`
- `FakeExecutionPort`
- `FakeAuditQueryPort`
- `FakePolicyStatePort`
- `FakeAuditSinkPort`
- `FakeMetricsSinkPort`
- `FakeLoggerPort`
- `FakeClockPort`
- `FakeIdGeneratorPort`

Rules:

- fakes must support deterministic assertions
- fakes must capture call order and arguments
- fakes must support injected failures and delays

## Minimum `M1` Test Matrix

| Area | Minimum Cases |
| --- | --- |
| planner | 8 |
| policy | 8 |
| session resolution | 6 |
| routing | 6 |
| execution | 8 |
| shaping | 8 |
| audit and diagnostics | 6 |

## Release Gate For `M1`

`M1` is not complete until:

1. shared-core unit fixtures pass
2. denial paths prove no runtime call occurs
3. mutating success paths prove audit emission
4. shaping paths prove truncation and redaction behavior
5. transport routing is deterministic under fixture control
