# robotframework-aidebug

Standalone AI-debug tooling for Robot Framework.

This repository is independent of RobotCode. It contains two separately installable packages:

- Python backend package: [src/robotframework_aidebug](/home/many/workspace/robotframework-aidebug/src/robotframework_aidebug)
- VS Code extension package: [vscode-extension](/home/many/workspace/robotframework-aidebug/vscode-extension)

The backend exposes a structured local command surface for:

- execution state snapshots
- stack, scopes, and variable traversal
- variable mutation with policy gating
- structured keyword execution
- structured snippet execution
- audit logging, redaction, and rate limiting

The VS Code extension talks to the backend over a local stdio JSON protocol and can be installed manually from a `.vsix`, without relying on the Marketplace.

## Packages

### Python backend

Package name: `robotframework-aidebug`

Console scripts:

- `robotframework-aidebug`
- `robotframework-aidebug-stdio`

### VS Code extension

Package name: `robotframework-aidebug-vscode`

Provides commands for:

- starting and stopping the backend
- showing current state
- showing variables
- resetting the demo session
- running a full recovery journey

## Installation

### Backend with `uv`

```bash
uv sync
uv pip install .
```

### Backend with `pip`

```bash
pip install .
```

### Verify backend installation

```bash
robotframework-aidebug demo
robotframework-aidebug benchmark --iterations 20
robotframework-aidebug-stdio <<'EOF2'
{"id":1,"command":"health"}
__EXIT__
EOF2
```

### VS Code extension without Marketplace

```bash
cd vscode-extension
npm install
npm run package:vsix
code --install-extension dist/robotframework-aidebug-vscode-0.1.0.vsix
```

If the backend executable is not on `PATH`, configure the extension setting:

- `robotframeworkAidebug.backendExecutable`

Example value for this repository's local virtualenv:

```text
/home/many/workspace/robotframework-aidebug/.venv/bin/robotframework-aidebug-stdio
```

## Usage

### Backend demo

```bash
robotframework-aidebug demo
```

### Benchmarks

```bash
robotframework-aidebug benchmark --iterations 200
```

### Long-running backend protocol

```bash
robotframework-aidebug-stdio
```

Then send newline-delimited JSON requests such as:

```json
{"id":1,"command":"health"}
{"id":2,"command":"robot/getExecutionState","arguments":{"includeStack":true,"includeScopes":true}}
{"id":3,"command":"robot/getVariablesSnapshot","arguments":{"scopes":["local","test","suite","global"],"max_items":20}}
```

### VS Code workflow

1. Install the backend.
2. Install the VSIX from `vscode-extension/dist`.
3. Open VS Code.
4. Run `Robot Framework AI Debug: Start Backend`.
5. Run `Robot Framework AI Debug: Show State`.
6. Run `Robot Framework AI Debug: Show Variables` or `Robot Framework AI Debug: Run Recovery Journey`.

## Development

### Python validation

```bash
uv run pytest --cov=robotframework_aidebug --cov-report=term-missing
uv run python -m robotframework_aidebug.benchmark
```

### Extension validation

```bash
cd vscode-extension
npm test
npm run package:vsix
code --install-extension dist/robotframework-aidebug-vscode-0.1.0.vsix --force
```

## Documentation

- architecture index: [docs/index.md](/home/many/workspace/robotframework-aidebug/docs/index.md)
- validation report: [docs/implementation/validation.md](/home/many/workspace/robotframework-aidebug/docs/implementation/validation.md)
- benchmark report: [docs/implementation/benchmark-results.md](/home/many/workspace/robotframework-aidebug/docs/implementation/benchmark-results.md)
- research basis: [docs/research.md](/home/many/workspace/robotframework-aidebug/docs/research.md)

## Verification snapshot

- Python: `3.13.11`
- `uv`: `0.9.26`
- Robot Framework: `7.4.2`
- Python tests: `24 passed`
- Extension tests: `2 passed`
- VSIX artifact: [robotframework-aidebug-vscode-0.1.0.vsix](/home/many/workspace/robotframework-aidebug/vscode-extension/dist/robotframework-aidebug-vscode-0.1.0.vsix)
