# Chat Agents Execution Pipeline

## Purpose

This document specifies the shared-core invocation pipeline for `M1`.

All tool invocations across LM tools, chat participant flows, and MCP must follow this sequence.

## Pipeline Steps

### 1. Intake

Inputs:

- host surface type
- raw tool request
- optional host session selection
- optional cancellation token

Rules:

- reject unknown tool ids early
- attach initial diagnostics context
- do not execute runtime operations here

### 2. Plan

Action:

- normalize raw input into the canonical invocation plan

Outputs:

- canonical tool id
- normalized arguments
- budget class
- target session strategy
- confirmation and audit requirements

Failure paths:

- `INVALID_ARGUMENT`
- `PAYLOAD_TOO_LARGE`

### 3. Pre-Policy Evaluation

Action:

- evaluate control mode, trust, and tool class rules

Outputs:

- `allow`
- `deny`
- `confirm`

Failure or denial paths:

- `POLICY_MODE_DENIED`
- `WORKSPACE_TRUST_REQUIRED`
- `CONFIRMATION_REQUIRED`

Rule:

- no runtime call may happen before policy permits it

### 4. Session Resolution

Action:

- resolve the target session and frame

Outputs:

- resolved session id
- resolved frame id if needed
- resolved transport preference inputs

Failure paths:

- `SESSION_NOT_FOUND`
- `SESSION_AMBIGUOUS`
- `FRAME_REQUIRED`
- `MUTATION_REQUIRES_PAUSED_SESSION`

### 5. Transport Routing

Action:

- choose bridge, embedded, or fallback runtime adapter

Selection order:

1. explicit session/transport compatibility
2. active live debug session compatibility
3. configured default transport preference
4. fallback only if semantics remain valid

Failure paths:

- `TRANSPORT_UNAVAILABLE`
- `CAPABILITY_UNAVAILABLE`

### 6. Execution

Action:

- invoke the runtime adapter through the transport-neutral port

Rules:

- obey timeout and queueing policy
- propagate cancellation
- no host formatting at this stage

Failure paths:

- `TOOL_TIMEOUT`
- `TOOL_CANCELLED`
- `QUEUE_REJECTED`
- tool-specific runtime failures

### 7. Result Shaping

Action:

- apply token budgets, truncation, and redaction

Rules:

- shape after runtime success or bounded failure details
- preserve correctness while limiting size
- keep a continuation hint when truncation occurs

Failure paths:

- `REDACTION_FAILURE`
- `RESULT_SHAPING_FAILED`

### 8. Audit And Diagnostics

Action:

- emit audit events where required
- record latency, denial, truncation, and failure metrics
- attach correlation ids to all logs

Rule:

- audit failures must not silently discard a completed mutating operation
- if audit persistence fails, surface the problem diagnostically and decide release policy explicitly

### 9. Envelope Finalization

Action:

- build the canonical `success`, `partial`, `denied`, or `failure` envelope
- return it to the host adapter

Rule:

- host adapters may reformat, but must not alter canonical meaning

## Pipeline Invariants

1. Every invocation has exactly one final envelope.
2. Every invocation has exactly one correlation id.
3. Every mutating or execution action produces audit output.
4. Every host-visible payload passes through shaping and redaction.
5. No host surface bypasses the pipeline for supported production behavior.

## Concurrency Rules

- inspection tools may run concurrently when runtime safety permits
- control tools serialize per session
- execution and mutation tools serialize per session
- session termination cancels queued and active operations for that session where possible

## Retry Rules

- read-only inspection failures may be retried automatically only if marked retryable
- mutating and execution tools must not be retried automatically without explicit future deduplication semantics

## Observability Events

Recommended events:

- `invocation.received`
- `invocation.planned`
- `invocation.denied`
- `invocation.routed`
- `invocation.started`
- `invocation.completed`
- `invocation.failed`
- `invocation.shaped`
- `invocation.truncated`
- `invocation.redacted`
