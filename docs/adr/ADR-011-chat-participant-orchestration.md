# ADR-011: Add A Specialized Chat Participant As An Optional Orchestration Layer

- Status: Accepted
- Date: 2026-03-09

## Context

VS Code chat participants are domain-specific assistants addressed by `@mention`. They differ from language model tools because they own conversation orchestration themselves.

For `robotframework-aidebug`, a participant can provide:

- expert guidance for debugging workflows
- follow-up suggestions
- slash commands for common operations
- history-aware guidance during a debug session

But participants are not a substitute for tool exposure, because agent mode primarily relies on tools.

## Decision

Add a dedicated optional chat participant, for example `@robotdebug`, after the tool surface exists.

The participant will:

1. orchestrate existing LM tools and MCP-equivalent operations
2. provide guided workflows and follow-ups
3. remain optional for the core product architecture

## Rationale

1. A participant gives a coherent user-facing expert persona for manual chat.
2. Tools remain the reusable primitive for agentic workflows.
3. Keeping the participant optional reduces architectural coupling.

## Consequences

- The product gains a guided conversational UX without sacrificing tool reuse.
- Participant disambiguation and prompt design become additional product concerns.
- Manual conversational experiences and autonomous agent experiences can evolve independently.
