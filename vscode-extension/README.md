# Robot Framework AI Debug for VS Code

Standalone VS Code extension for the `robotframework-aidebug` backend.

This extension is independent of RobotCode. It starts a local backend executable and exchanges newline-delimited JSON messages over stdio.

## What it provides

- backend lifecycle commands
- execution state inspection
- variable snapshot inspection
- demo session reset
- a full recovery journey command that exercises mutation and snippet execution

## Install without Marketplace

### 1. Install the backend

With `uv`:

```bash
uv sync
uv pip install .
```

With `pip`:

```bash
pip install .
```

This installs the backend executable:

```text
robotframework-aidebug-stdio
```

### 2. Build the VSIX

```bash
cd vscode-extension
npm install
npm run package:vsix
```

### 3. Install the VSIX

```bash
code --install-extension dist/robotframework-aidebug-vscode-0.1.0.vsix
```

## Configuration

### Backend executable on PATH

Default setting:

```json
{
  "robotframeworkAidebug.backendExecutable": "robotframework-aidebug-stdio",
  "robotframeworkAidebug.backendArgs": []
}
```

### Backend executable from a local virtual environment

Example:

```json
{
  "robotframeworkAidebug.backendExecutable": "/home/many/workspace/robotframework-aidebug/.venv/bin/robotframework-aidebug-stdio",
  "robotframeworkAidebug.backendArgs": []
}
```

## Commands

- `Robot Framework AI Debug: Start Backend`
- `Robot Framework AI Debug: Stop Backend`
- `Robot Framework AI Debug: Show State`
- `Robot Framework AI Debug: Show Variables`
- `Robot Framework AI Debug: Reset Demo Session`
- `Robot Framework AI Debug: Run Recovery Journey`

## Typical usage

1. Install the backend.
2. Install the `.vsix`.
3. Configure `robotframeworkAidebug.backendExecutable` if needed.
4. Run `Robot Framework AI Debug: Start Backend`.
5. Run `Robot Framework AI Debug: Show State`.
6. Run `Robot Framework AI Debug: Show Variables`.
7. Run `Robot Framework AI Debug: Run Recovery Journey` to exercise the full flow.

The extension writes results and backend logs to the `Robot Framework AI Debug` output channel.

## Validation

```bash
npm test
npm run package:vsix
code --install-extension dist/robotframework-aidebug-vscode-0.1.0.vsix --force
```

## Future Marketplace readiness

This package is already prepared for later publishing with:

- extension metadata in `package.json`
- license
- changelog
- VSIX packaging command
- categories, keywords, and configuration schema

Before publishing, replace the placeholder repository, bugs, and homepage URLs with the final project URLs.
