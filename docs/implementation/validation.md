# Validation

## Automated Validation Commands

```bash
uv sync
uv run pytest
uv run pytest --cov=robotframework_aidebug --cov-report=term-missing
uv run python -m robotframework_aidebug
uv run python -m robotframework_aidebug.benchmark
cd vscode-extension
npm install
npm test
npm run package:vsix
code --install-extension dist/robotframework-aidebug-vscode-0.1.0.vsix --force
```

## Current Results

- python tests: `24 passed`
- package coverage: `88%`
- CLI demo: verified
- benchmark runner: verified
- extension tests: `2 passed`
- VSIX packaging: verified
- VSIX manual installation through `code --install-extension`: verified

## End-To-End User Journeys Covered

The e2e suite in [tests/e2e/test_user_journeys.py](/home/many/workspace/robotframework-aidebug/tests/e2e/test_user_journeys.py) covers three deep workflows.

### Journey 1: Diagnose, Recover, Resume

- inspect paused state,
- inspect redacted variables,
- set a local variable,
- set suite and global variables through structured keywords,
- execute a multi-step snippet with `FOR`, `IF`, assignment, and logging,
- verify nested list mutation,
- continue and pause the session again,
- assert audit and event history.

### Journey 2: Read-Only Safety

- inspect state and variables,
- verify redaction,
- verify that keyword and snippet execution are rejected in `readOnly` mode.

### Journey 3: Deep Variable Navigation And Stepping

- navigate from a scope reference into a nested list,
- mutate a specific list item through `setVariable`,
- step in, step out, and next,
- evaluate an expression using Robot variable semantics.

## Validation Summary

The implemented package satisfies the local repository scope:

- structured command dispatch,
- policy-gated read and write paths,
- structured keyword execution,
- structured snippet execution with Robot parser wrapping,
- audit logging,
- nested variable traversal and mutation,
- demo CLI,
- repeatable benchmark harness,
- standalone VS Code extension package,
- offline VSIX installation path,
- future marketplace-ready extension metadata.
