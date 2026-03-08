# DDD Overview

## Problem Statement

Design a system that lets an AI agent inspect and influence a live Robot Framework debug session in a controlled, auditable way without bypassing RobotCode's existing debugger architecture.

## Ubiquitous Language

- `Agent Tool`: a deterministic editor-hosted function exposed to the language model runtime.
- `Agent Session`: the active logical interaction between tools and one RobotCode debug session.
- `Execution Snapshot`: a compact, bounded summary of current runtime state.
- `Session Router`: the extension-side component that resolves the active RobotCode debug session.
- `Execution Command`: a structured request to read state, mutate variables, or execute Robot behavior.
- `Policy Gate`: the component that decides whether a command is allowed.
- `Audit Entry`: the durable record of a tool action and its outcome.
- `Snippet Envelope`: the synthetic suite/test wrapper used to parse multi-line Robot body content safely.

## Bounded Contexts

1. `Agent Interaction`
   - lives in the VS Code extension host
   - owns tools, invocation text, summarization, and user-facing failures
2. `Debug Session Orchestration`
   - lives across the extension and DAP boundary
   - owns session routing, request dispatch, and response correlation
3. `Robot Execution Control`
   - lives in the Python debug server
   - owns execution-state reading, variable access, stepping, keyword execution, and snippet parsing
4. `Governance`
   - spans extension and debug server
   - owns enablement, redaction, audit, quotas, and read/write separation

## Design Principle

Keep domain behavior close to the boundary that can enforce it.

- tool discoverability and UX belong in the extension,
- execution semantics belong in the debug server,
- safety rules are checked in both places,
- free-form agent behavior is never trusted as the protocol.
