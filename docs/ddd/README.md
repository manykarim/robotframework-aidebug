# DDD Overview

## Problem Statement

Design a standalone product that lets an AI agent inspect and influence a live Robot Framework debug session in a controlled, auditable, high-reliability way.

The product must support both:

1. integration with an existing RobotCode session
2. a future fully independent debugger mode

## Ubiquitous Language

- `Agent Tool`: a deterministic tool exposed to the editor-hosted language model runtime
- `Agent Session`: the AI-facing control plane bound to one debug session
- `Session Router`: the component that chooses the active live session and transport mode
- `Bridge Mode`: integration through an active RobotCode session
- `Embedded Mode`: integration through a `robotframework-aidebug` debug adapter
- `Execution Snapshot`: bounded summary of current runtime state
- `Runtime Namespace`: names and variables visible in the paused execution context
- `Static Namespace`: editor-time Robot Framework symbol model derived from source analysis
- `Policy Gate`: component that decides whether a requested operation is allowed
- `Audit Entry`: durable record of an attempted or completed action
- `Capability Probe`: transport-neutral check that determines what the active session supports

## Bounded Contexts

1. `Agent Experience`
   Owns tool registration, UX copy, result summarization, and user-facing explanations.
2. `Session Orchestration`
   Owns transport selection, session routing, correlation ids, and capability probing.
3. `Runtime Debug Control`
   Owns live stack, scopes, variables, execution control, keyword execution, and snippet execution.
4. `Static Robot Intelligence`
   Owns editor-time namespace resolution, keyword documentation, import awareness, and contextual grounding.
5. `Governance`
   Owns policy evaluation, redaction, rate limiting, audit, and safe defaults.
6. `Packaging And Distribution`
   Owns artifact separation, compatibility policy, install flows, and version negotiation.

## Strategic Design Principle

Keep transport and runtime concerns replaceable, but keep policy and domain language stable.
