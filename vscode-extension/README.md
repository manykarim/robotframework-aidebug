# Robot Framework AI Debug for VS Code

VS Code extension for `robotframework-aidebug`.

This extension can operate in three ways:

1. `Bridge Mode`
   Route commands to an active RobotCode debug session.
2. `Embedded Mode`
   Start and use the `robotframework-aidebug` debug adapter directly.
3. `Backend Fallback`
   Talk to the standalone stdio backend when no supported debug session is active.

## Install Without Marketplace

### 1. Install the Python package

```bash
uv sync
uv pip install .
```

This provides:

- `robotframework-aidebug-stdio`
- `robotframework-aidebug-dap`

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
  "robotframeworkAidebug.autoStartBackend": true
}
```

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
  "name": "Robot Framework AI Debug",
  "program": "${workspaceFolder}/tests/checkout.robot",
  "stopOnEntry": true,
  "mode": "fullControl"
}
```

## Validation

```bash
npm test
npm run package:vsix
```

## Notes

- `Reset Demo Session` only applies to backend fallback mode.
- `Show Context` prefers runtime completions and falls back to static editor analysis.
- In `auto` transport mode, a live supported debug session takes priority over the backend fallback.
