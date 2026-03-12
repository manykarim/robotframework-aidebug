# ADR-012: Apply Governance, Confirmation, And Least-Privilege Rules Across All Agent Surfaces

- Status: Accepted
- Date: 2026-03-09

## Context

Chat-agent integration expands the attack and failure surface:

- autonomous invocation by agents
- cloud-processed tool outputs depending on host configuration
- mutating tools being called with model-generated arguments
- MCP servers introducing transport exposure beyond the extension host

The VS Code tool model and MCP model both support confirmation and metadata, but they do not enforce the product's safety semantics automatically.

## Decision

Apply one governance model across LM tools, chat participants, and MCP tools.

Mandatory controls:

1. `off`, `readOnly`, and `fullControl` operating modes
2. workspace trust checks
3. paused-session requirement for mutating runtime operations
4. redaction and truncation before any agent-visible output
5. confirmations for mutating or potentially dangerous actions
6. audit logging for mutating or executing tools
7. no HTTP listener by default
8. explicit authentication/authorization if HTTP is enabled

## Rationale

1. Host UX is not a sufficient security boundary.
2. Tool confirmation and read-only metadata must align with product policy, not replace it.
3. Safety must be transport-agnostic.

## Consequences

- Tool and MCP schemas must carry policy-relevant metadata.
- Some agent workflows will be intentionally interrupted by confirmation requirements.
- Security review is a release gate, not a postscript.
