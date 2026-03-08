# ADR-001: Host Agent Debug Control In The VS Code Extension

- Status: Accepted
- Date: 2026-03-08

## Context

The research shows that RobotCode already has a functioning DAP path:

- VS Code debug UI and extension
- RobotCode debug launcher
- RobotCode debug server embedded with Robot Framework execution

The missing capability is not basic debugging. The missing capability is a deterministic, tool-friendly control surface that an AI agent can use without bypassing the editor's debug session.

The main options were:

1. drive the existing debug console `evaluate` channel directly,
2. expose a separate HTTP or MCP server as the primary interface,
3. add agent tools inside the VS Code extension and keep DAP as the protocol boundary.

## Decision

The system will host Agent Debug Control inside the VS Code extension.

The extension will expose debug tools through `vscode.lm.registerTool` and route those tools to the active RobotCode debug session through `debugSession.customRequest(...)`.

DAP remains the canonical cross-process boundary.

## Rationale

1. The active debug session in VS Code is the ground truth for what is paused, resumed, attached, or detached.
2. The extension already understands RobotCode session lifecycle and custom debug events.
3. Keeping AI integration in the editor avoids coupling the Robot Framework runtime directly to AI concerns.
4. Tool invocations can be restricted with enablement conditions, workspace trust, and explicit user-facing invocation text.
5. This path is additive. Existing non-agent debugging remains unchanged.

## Consequences

### Positive

- Reuses existing RobotCode architecture.
- Preserves a single authority for session routing.
- Allows deterministic tool schemas instead of free-form chat behavior.
- Makes feature gating and audit logging straightforward in the extension.

### Negative

- The primary experience depends on VS Code tool support.
- Non-VS Code agents will need a secondary bridge.
- The extension must own caching, summarization, and failure handling for tool calls.

## Non-Goals

- Direct agent access to Robot Framework internals.
- Replacing the existing DAP or debug launcher architecture.
- Designing the optional HTTP or MCP bridge as the first delivery target.
