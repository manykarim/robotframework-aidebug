# Robot Framework AI Debug for VS Code

VS Code extension for `robotframework-aidebug`.

This extension can operate in three ways:

1. `Bridge Mode`
   Route commands to an active RobotCode debug session.
2. `Embedded Mode`
   Start and use the `robotframework-aidebug` debug adapter directly.
3. `Backend Fallback`
   Talk to the standalone stdio backend when no supported debug session is active.

It also exposes three chat-agent surfaces:

1. native VS Code LM tools
2. a dedicated `@robotdebug` chat participant
3. an MCP server definition provider for the packaged `robotframework-aidebug-mcp` server

## Install Without Marketplace

### 1. Install the Python package

```bash
uv sync
uv pip install .
```

This provides:

- `robotframework-aidebug-stdio`
- `robotframework-aidebug-dap`
- `robotframework-aidebug-mcp`

### 2. Build the VSIX

```bash
cd vscode-extension
npm install
npm run package:vsix
```

### 3. Install the VSIX

```bash
code --install-extension dist/robotframework-aidebug-vscode-0.1.0.vsix --force
```

## Settings

```json
{
  "robotframeworkAidebug.backendExecutable": "/home/many/workspace/robotframework-aidebug/.venv/bin/robotframework-aidebug-stdio",
  "robotframeworkAidebug.adapterExecutable": "/home/many/workspace/robotframework-aidebug/.venv/bin/robotframework-aidebug-dap",
  "robotframeworkAidebug.preferredTransport": "auto",
  "robotframeworkAidebug.controlMode": "fullControl",
  "robotframeworkAidebug.autoStartBackend": true,
  "robotframeworkAidebug.mcpExecutable": "/home/many/workspace/robotframework-aidebug/.venv/bin/robotframework-aidebug-mcp",
  "robotframeworkAidebug.mcpTransport": "stdio",
  "robotframeworkAidebug.mcpHttpBaseUrl": "http://127.0.0.1:8765/mcp"
}
```

## Chat Agent Surfaces

### LM Tools

The extension contributes these LM tools:

- `get_state`
- `get_variables_snapshot`
- `get_runtime_context`
- `get_capabilities`
- `get_audit_log`
- `control_execution`
- `execute_keyword`
- `execute_page_script`
- `execute_snippet`
- `set_variable`

Operational guidance:

- `execute_keyword` now uses plain Robot keyword syntax first and only falls back to legacy `! ...` REPL syntax when needed for compatibility.
- Use `assign`, for example `["${page_source}"]`, to capture keyword outputs.
- `execute_page_script` is the preferred Browser JavaScript helper for page-scoped execution and escapes `${...}` template segments for bridge-mode Robot sessions.
- Use `get_variables_snapshot` with `names` and `start` to retrieve large values without side-channel file reads.
- Use `execute_snippet` only when Browser evaluation requires multi-step Robot control flow.

### Chat Participant

Use `@robotdebug` in the VS Code chat view.

Supported slash commands:

- `/state`
- `/variables`
- `/context`
- `/capabilities`
- `/recover`
- `/run-keyword`
- `/run-page-script`
- `/run-snippet`
- `/set-variable`
- `/step`

### MCP Provider

The extension registers an MCP server-definition provider for the packaged `robotframework-aidebug-mcp` executable. Use `stdio` by default. `streamable-http` is supported, but it should be enabled only deliberately and with a bearer token.

## Commands

- `Robot Framework AI Debug: Start Backend`
- `Robot Framework AI Debug: Stop Backend`
- `Robot Framework AI Debug: Start Embedded Session`
- `Robot Framework AI Debug: Show Capabilities`
- `Robot Framework AI Debug: Show State`
- `Robot Framework AI Debug: Show Variables`
- `Robot Framework AI Debug: Show Audit Log`
- `Robot Framework AI Debug: Show Context`
- `Robot Framework AI Debug: Reset Demo Session`
- `Robot Framework AI Debug: Run Recovery Journey`

## Launch Configuration

```json
{
  "type": "robotframework-aidebug",
  "request": "launch",
  "name": "AI Debug Bridge: Run Current",
  "program": "${file}",
  "stopOnEntry": true,
  "mode": "fullControl"
}
```

## Validation

```bash
npm test
npm run package:vsix
```

Current local validation:

- extension tests: `30 passed`
- VSIX packaging: verified
- VSIX installation: verified

## Notes

- `Reset Demo Session` only applies to backend fallback mode.
- `Show Context` prefers runtime completions and falls back to static editor analysis.
- In `auto` transport mode, a live supported debug session takes priority over the backend fallback.
- Native chat-agent surfaces use the same transport priority: active supported debug session first, backend fallback second.
