# robotframework-aidebug

Standalone AI-assisted debugging for Robot Framework in VS Code.

This repository now contains both:

- a Python backend and embedded debug adapter in [src/robotframework_aidebug](/home/many/workspace/robotframework-aidebug/src/robotframework_aidebug)
- a VS Code extension in [vscode-extension](/home/many/workspace/robotframework-aidebug/vscode-extension)
- a packaged MCP server exposed by [mcp_server.py](/home/many/workspace/robotframework-aidebug/src/robotframework_aidebug/mcp_server.py)

## Runtime Modes

### Bridge Mode

If VS Code already has an active RobotCode debug session, the extension routes commands to that live session through the VS Code debug API.

### Embedded Mode

The extension can start its own `robotframework-aidebug` debug session through the bundled DAP adapter executable:

- debug type: `robotframework-aidebug`
- adapter executable: `robotframework-aidebug-dap`

### Backend Fallback Mode

If no supported debug session is active, the extension can fall back to the standalone backend protocol over stdio using:

- `robotframework-aidebug-stdio`

## Features

- capability probing and transport-aware routing
- execution state inspection
- stack, scopes, variable traversal, and bounded variable snapshots
- variable mutation with policy gating
- paused-context keyword execution
- structured page-scoped Browser JavaScript execution
- paused-context multi-line snippet execution
- runtime completions
- audit log inspection
- native VS Code LM tools for chat agents such as GitHub Copilot
- dedicated `@robotdebug` chat participant
- MCP stdio and streamable HTTP server for MCP-native agents such as Cline
- static context extraction from the active editor when no runtime context is available
- standalone VSIX packaging without Marketplace dependency

## Installation

### Python with `uv`

```bash
uv sync
uv pip install .
```

### Python with `pip`

```bash
pip install .
```

Installed console scripts:

- `robotframework-aidebug`
- `robotframework-aidebug-stdio`
- `robotframework-aidebug-dap`
- `robotframework-aidebug-mcp`

### VS Code extension without Marketplace

```bash
cd vscode-extension
npm install
npm run package:vsix
code --install-extension dist/robotframework-aidebug-vscode-0.1.0.vsix --force
```

## VS Code Settings

```json
{
  "robotframeworkAidebug.backendExecutable": "/home/many/workspace/robotframework-aidebug/.venv/bin/robotframework-aidebug-stdio",
  "robotframeworkAidebug.backendArgs": [],
  "robotframeworkAidebug.adapterExecutable": "/home/many/workspace/robotframework-aidebug/.venv/bin/robotframework-aidebug-dap",
  "robotframeworkAidebug.adapterArgs": [],
  "robotframeworkAidebug.preferredTransport": "auto",
  "robotframeworkAidebug.controlMode": "fullControl",
  "robotframeworkAidebug.autoStartBackend": true,
  "robotframeworkAidebug.mcpExecutable": "/home/many/workspace/robotframework-aidebug/.venv/bin/robotframework-aidebug-mcp",
  "robotframeworkAidebug.mcpTransport": "stdio"
}
```

## Usage

### Native Chat Agents In VS Code

When the extension is installed in a current VS Code build, it contributes LM tools for chat agents and a dedicated participant:

- LM tools:
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
- chat participant:
  - `@robotdebug`
  - slash commands: `/state`, `/variables`, `/context`, `/capabilities`, `/recover`, `/run-keyword`, `/run-snippet`, `/set-variable`, `/step`

These surfaces use the active supported debug session when available and fall back to the standalone backend when needed.

Recommended usage patterns:

- `execute_keyword`:
  - send the plain keyword name, for example `Get Page Source`
  - use `assign`, for example `["${page_source}"]`, to capture results
- `execute_page_script`:
  - prefer this over free-form snippets for Browser `Evaluate JavaScript`
  - use `selector: "body"` for page-scoped execution
  - scripts containing `${...}` are escaped for bridge-mode Robot sessions
- `get_variables_snapshot`:
  - use `names`, for example `["${page_source}"]`, for targeted retrieval
  - use `start` with `nextStart` for continuation when a payload is truncated
- Browser JavaScript:
  - prefer `execute_page_script` first
  - use `execute_snippet` only when multi-step control flow is required

### Bridge Mode With RobotCode

1. Start a RobotCode debug session.
2. Open the Command Palette.
3. Run:
   - `Robot Framework AI Debug: Show Capabilities`
   - `Robot Framework AI Debug: Show State`
   - `Robot Framework AI Debug: Show Variables`
   - `Robot Framework AI Debug: Show Context`
   - `Robot Framework AI Debug: Run Recovery Journey`

### Selector Validation Workflow

The repository includes a reproducible Browser selector-validation suite:

- [validate_interactable_selectors.robot](/home/many/workspace/robotframework-aidebug/validate_interactable_selectors.robot)

Run it with:

```bash
uv run --no-sync robot validate_interactable_selectors.robot
```

### Embedded Mode

1. Run `Robot Framework AI Debug: Start Embedded Session`.
2. Or use this launch configuration:

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

3. Then use the same AI Debug commands against the active session.

### Backend Fallback Mode

1. Run `Robot Framework AI Debug: Start Backend`.
2. Use the state, variables, context, capabilities, audit-log, and recovery-journey commands.
3. `Robot Framework AI Debug: Reset Demo Session` is only available in this fallback mode.

### CLI

```bash
robotframework-aidebug demo
robotframework-aidebug benchmark --iterations 200
robotframework-aidebug stdio-server
robotframework-aidebug dap-server
robotframework-aidebug-mcp --transport stdio --no-banner
```

### MCP For Cline And Other MCP Clients

Stdio example:

```json
{
  "servers": {
    "robotframework-aidebug": {
      "type": "stdio",
      "command": "uv",
      "args": ["run", "robotframework-aidebug-mcp", "--transport", "stdio", "--no-banner"]
    }
  }
}
```

Optional streamable HTTP example:

```bash
uv run robotframework-aidebug-mcp --transport streamable-http --host 127.0.0.1 --port 8765 --path /mcp --auth-token secret-token --no-banner
```

## Validation

Current local validation results:

- Python tests: `43 passed`
- Python coverage: `86%`
- VS Code extension tests: `30 passed`
- MCP stdio and HTTP end-to-end journeys: included in the Python suite
- DAP end-to-end journey tests: included in the Python suite
- Browser selector suite: verified locally and covered by an e2e test
- VSIX packaging: verified
- local VSIX installation: verified

Validation artifacts:

- [docs/implementation/validation.md](/home/many/workspace/robotframework-aidebug/docs/implementation/validation.md)
- [docs/implementation/benchmark-results.md](/home/many/workspace/robotframework-aidebug/docs/implementation/benchmark-results.md)
- [docs/index.md](/home/many/workspace/robotframework-aidebug/docs/index.md)

## Development

### Python

```bash
.venv/bin/python -m pytest --cov=robotframework_aidebug --cov-report=term-missing
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run --no-sync python -m robotframework_aidebug.benchmark
uv run --no-sync python -m robotframework_aidebug.mcp_server --help
```

### Extension

```bash
cd vscode-extension
npm test
npm run package:vsix
```
