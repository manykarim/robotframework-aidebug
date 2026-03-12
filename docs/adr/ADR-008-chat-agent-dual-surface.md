# ADR-008: Adopt Dual-Surface Chat Agent Integration

- Status: Accepted
- Date: 2026-03-09

## Context

`robotframework-aidebug` must integrate with chat agents in VS Code across two distinct families of clients:

1. VS Code-native chat agents and agent mode, such as GitHub Copilot, which can use extension-contributed language model tools and chat participants.
2. MCP-based chat agents, such as Cline and other clients, which consume MCP tools, prompts, and resources.

The official VS Code AI extensibility model distinguishes extension-contributed language model tools, chat participants, and MCP servers as separate but complementary integration paths.

## Decision

Adopt a dual-surface chat-agent architecture.

1. Use VS Code `languageModelTools` as the primary native integration surface for Copilot-style agent mode in VS Code.
2. Provide an MCP server surface for interoperable external or MCP-native clients.
3. Keep both surfaces backed by a shared application/domain layer so behavior, policy, and contracts stay aligned.
4. Treat chat participants as an optional orchestration layer, not as the only entry point.

## Rationale

1. VS Code-native tools are the strongest integration for agent mode and VS Code UX.
2. MCP is the broadest interoperability path for Cline and other non-native agent clients.
3. Duplicating domain logic across tool surfaces would create drift and inconsistent safety behavior.

## Consequences

### Positive

- One product can serve both Copilot-style and MCP-style agent ecosystems.
- Safety and policy can be centralized.
- Interoperability does not require a separate product line.

### Negative

- Testing scope expands across multiple client models.
- Packaging and compatibility management become more complex.
- The team must manage user expectations between native and MCP capabilities.
