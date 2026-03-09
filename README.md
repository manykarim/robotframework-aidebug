# robotframework-aidebug

Standalone AI-assisted debugging for Robot Framework in VS Code.

This repository now contains both:

- a Python backend and embedded debug adapter in [src/robotframework_aidebug](/home/many/workspace/robotframework-aidebug/src/robotframework_aidebug)
- a VS Code extension in [vscode-extension](/home/many/workspace/robotframework-aidebug/vscode-extension)

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
- paused-context multi-line snippet execution
- runtime completions
- audit log inspection
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
  "robotframeworkAidebug.autoStartBackend": true
}
```

## Usage

### Bridge Mode With RobotCode

1. Start a RobotCode debug session.
2. Open the Command Palette.
3. Run:
   - `Robot Framework AI Debug: Show Capabilities`
   - `Robot Framework AI Debug: Show State`
   - `Robot Framework AI Debug: Show Variables`
   - `Robot Framework AI Debug: Show Context`
   - `Robot Framework AI Debug: Run Recovery Journey`

### Embedded Mode

1. Run `Robot Framework AI Debug: Start Embedded Session`.
2. Or use this launch configuration:

```json
{
  "type": "robotframework-aidebug",
  "request": "launch",
  "name": "Robot Framework AI Debug",
  "program": "${workspaceFolder}/demo.robot",
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
```

## Validation

Current local validation results:

- Python tests: `30 passed`
- Python coverage: `87%`
- VS Code extension tests: `2 passed`
- DAP end-to-end journey tests: included in the Python suite
- VSIX packaging: verified

Validation artifacts:

- [docs/implementation/validation.md](/home/many/workspace/robotframework-aidebug/docs/implementation/validation.md)
- [docs/implementation/benchmark-results.md](/home/many/workspace/robotframework-aidebug/docs/implementation/benchmark-results.md)
- [docs/index.md](/home/many/workspace/robotframework-aidebug/docs/index.md)

## Development

### Python

```bash
.venv/bin/python -m pytest --cov=robotframework_aidebug --cov-report=term-missing
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run --no-sync python -m robotframework_aidebug.benchmark
```

### Extension

```bash
cd vscode-extension
npm test
npm run package:vsix
```
