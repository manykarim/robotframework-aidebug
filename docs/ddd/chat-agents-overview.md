# Chat Agents Overview

## Problem Statement

Design a full chat-agent integration architecture for `robotframework-aidebug` that works across VS Code-native agents such as GitHub Copilot and MCP-native agents such as Cline, while preserving safety, reliability, and transport-independent domain behavior.

## Strategic Model

The system exposes one shared debug-control application layer through three user-facing surfaces:

1. `Language Model Tools`
   Native tool surface for VS Code agent mode.
2. `Chat Participant`
   Optional orchestrating expert persona for human-driven chat.
3. `MCP Server`
   Interoperable tool, prompt, and resource surface for MCP-capable clients.

## Ubiquitous Language

- `Agent Surface`: a host-specific exposure layer such as LM tools, chat participant, or MCP
- `Tool Contract`: the schema and semantics of one agent-callable action
- `Invocation Plan`: normalized representation of what the agent is trying to do
- `Result Envelope`: bounded, redacted response returned to the agent
- `Confirmation Policy`: rules that decide whether a host should prompt before execution
- `Prompt Guidance`: host-provided instructions that guide tool usage without replacing validation
- `Client Capability Profile`: known limits or expectations of a client surface

## Core Principle

Own domain semantics once, expose them many times.
