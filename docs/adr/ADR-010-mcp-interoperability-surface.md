# ADR-010: Provide MCP Interoperability For Non-Native Agent Clients

- Status: Accepted
- Date: 2026-03-09

## Context

MCP is the portable tool interface for clients such as Cline and other non-native agents. VS Code also supports MCP servers directly, including:

- stdio and HTTP transports
- tool annotations such as `readOnlyHint`
- prompts, resources, elicitation, and server instructions
- extension-registered MCP server definition providers

The adjacent `rf-mcp` project demonstrates proven patterns for MCP portability, including stdio/HTTP deployment, instruction templating, FastMCP compatibility management, token-efficient outputs, and input validation.

## Decision

`robotframework-aidebug` will define an MCP surface as the portability path for non-native agents.

1. `stdio` is the default MCP transport.
2. `HTTP` is optional and disabled by default.
3. The extension may register an MCP server definition provider for easy VS Code discovery and installation.
4. MCP tools, prompts, and resources must map to the same shared application layer used by LM tools.

## Rationale

1. MCP is the practical path for Cline and similar clients.
2. The product should not force every client into a VS Code extension-only tool model.
3. A shared application layer prevents semantic drift across native and MCP surfaces.

## Consequences

### Positive

- Cross-client interoperability.
- Optional remote/local deployment flexibility.
- Reuse outside VS Code when appropriate.

### Negative

- HTTP introduces security and operational complexity.
- MCP schema and server lifecycle become another compatibility boundary.
- Client behavior may differ materially across MCP hosts.

## Design Rule

Read-only MCP tools must be annotated as read-only wherever the MCP host supports it. Mutating tools must not default to silent execution.
