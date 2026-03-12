# ADR-014: Manage Compatibility And Release Strategy By Client Surface

- Status: Accepted
- Date: 2026-03-09

## Context

Chat-agent support spans multiple compatibility boundaries:

- VS Code version and AI API maturity
- GitHub Copilot/agent-mode behavior
- MCP client behavior across Cline and others
- RobotCode bridge compatibility
- Robot Framework and Python package versions
- optional FastMCP or alternative MCP framework versions if used

The `rf-mcp` project demonstrates that compatibility layers around evolving MCP frameworks are real maintenance work, not theoretical overhead.

## Decision

Release and test compatibility by surface.

1. Publish a compatibility matrix for native VS Code tools, chat participant support, and MCP surfaces.
2. Keep the shared domain/application contracts stable even when host integrations vary.
3. Prefer additive tool evolution and explicit version negotiation over silent behavior changes.
4. Treat MCP framework coupling as an implementation detail hidden behind an adapter.

## Consequences

- Release notes must distinguish native tool changes from MCP changes.
- CI must exercise representative client surfaces separately.
- Breaking tool schema changes require explicit versioning or migration guidance.
