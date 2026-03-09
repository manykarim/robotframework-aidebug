# Validation

## Commands Run

### Python

```bash
.venv/bin/python -m pytest
.venv/bin/python -m pytest --cov=robotframework_aidebug --cov-report=term-missing
.venv/bin/python -m robotframework_aidebug demo
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run --no-sync python -m robotframework_aidebug.benchmark
```

### Extension

```bash
cd vscode-extension
npm test
npm run package:vsix
```

## Current Results

- Python tests: `30 passed`
- Python coverage: `87%`
- Extension tests: `2 passed`
- CLI demo: verified
- benchmark command: verified
- VSIX packaging: verified

## What Is Covered

### Python

- policy and redaction rules
- structured and standard command dispatch
- runtime completions
- audit-log exposure
- snippet parsing and cache behavior
- stdio backend protocol
- DAP adapter protocol
- end-to-end DAP journey through a real subprocess

### Extension

- backend transport flow
- router behavior for active debug sessions versus backend fallback
- custom-event sync acknowledgement
- static-context extraction
- keyword-expression formatting for RobotCode-style REPL execution

## Key End-To-End Journeys

1. full-control backend journey with mutation, keyword execution, snippet execution, stepping, and audit checks
2. read-only safety journey
3. deep nested-variable navigation and stepping journey
4. embedded DAP journey through `robotframework_aidebug.dap_server`

## Residual Gaps

The local repository now implements the planned architecture and validates it locally. The remaining uncertainty is external compatibility drift when talking to future RobotCode and VS Code versions, which is a release-management concern rather than a missing local feature.
