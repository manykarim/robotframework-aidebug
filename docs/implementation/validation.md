# Validation

## Commands Run

### Python

```bash
.venv/bin/python -m pytest
.venv/bin/python -m pytest --cov=robotframework_aidebug --cov-report=term-missing
.venv/bin/python -m robotframework_aidebug demo
.venv/bin/python -m robotframework_aidebug.mcp_server --help
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run --no-sync python -m robotframework_aidebug.benchmark
UV_CACHE_DIR=$PWD/.uv-cache uv run --no-sync pytest tests/unit/test_runtime_context.py tests/unit/test_mcp_server.py tests/e2e/test_user_journeys.py
UV_CACHE_DIR=$PWD/.uv-cache uv run --no-sync robot validate_interactable_selectors.robot
```

### Extension

```bash
cd vscode-extension
npm test
npm run package:vsix
code --install-extension /home/many/workspace/robotframework-aidebug/vscode-extension/dist/robotframework-aidebug-vscode-0.1.0.vsix --force
```

## Current Results

- Python tests: `43 passed`
- Python coverage: `86%`
- Extension tests: `30 passed`
- CLI demo: verified
- MCP CLI help: verified
- benchmark command: verified
- VSIX packaging: verified
- VSIX installation: verified

## What Is Covered

### Python

- policy and redaction rules
- canonical envelope and failure mapping for chat-agent surfaces
- structured and standard command dispatch
- runtime completions
- runtime context surface
- structured page-script helper
- exact-name variable retrieval and paged variable snapshots
- audit-log exposure
- snippet parsing and cache behavior
- stdio backend protocol
- MCP stdio and streamable HTTP surfaces
- DAP adapter protocol
- end-to-end DAP journey through a real subprocess

### Extension

- backend transport flow
- LM tool registration and invocation behavior
- chat participant intent routing and summarization helpers
- router behavior for active debug sessions versus backend fallback
- MCP server-definition provider packaging
- custom-event sync acknowledgement
- static-context extraction
- keyword-expression normalization with compatibility fallback
- structured page-script helper with escaped interpolation
- retrospective regression coverage for assignment capture, paged variable retrieval, and selector-session failure modes

## Key End-To-End Journeys

1. full-control backend journey with mutation, keyword execution, snippet execution, stepping, and audit checks
2. read-only safety journey
3. deep nested-variable navigation and stepping journey
4. embedded DAP journey through `robotframework_aidebug.dap_server`
5. MCP stdio journey with tool discovery, prompt discovery, resource reads, and tool invocation
6. MCP streamable HTTP journey with bearer-auth enforcement and mutating tool invocation
7. retrospective regression journey for keyword normalization, assignment capture, and large-variable retrieval
8. Browser selector suite journey through `validate_interactable_selectors.robot`

## Residual Gaps

The local repository now implements the planned architecture and validates it locally. The remaining uncertainty is external compatibility drift when talking to future RobotCode, VS Code agent APIs, and MCP-host versions, which is a release-management concern rather than a missing local feature.
