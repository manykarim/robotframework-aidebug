# Incident Report: VS Code AI Debug Bridge Launch Failures

Date: 2026-03-09

## Executive Summary

Two distinct failures were observed while launching the `robotframework-aidebug` debug configuration in VS Code:

1. **Hard failure**: VS Code error dialog: _"Couldn't find a debug adapter descriptor for debug type 'robotframework-aidebug'"_.
2. **Soft failure**: after fixing activation, launching **AI Debug Bridge: Run Current** appears to do nothing (no usable debug session).

Primary root cause of (1): invalid extension activation event in the extension manifest.

Likely contributing causes of (2): missing/insufficient runtime diagnostics and fragile adapter path handling (workspace variable substitution assumptions), combined with stale defaults and weak failure signaling.

---

## Environment

- OS: Linux
- VS Code: `1.109.5`
- Workspace: `robotframework-aidebug`
- Installed relevant extensions:
  - `robotframework-aidebug.robotframework-aidebug-vscode@0.1.0`
  - `d-biehl.robotcode@2.2.0`
- Python venv present at `.venv`
- Verified executables exist:
  - `.venv/bin/robotframework-aidebug-stdio`
  - `.venv/bin/robotframework-aidebug-dap`

---

## User-Visible Symptoms

### Symptom A: Descriptor not found
When launching a config with `"type": "robotframework-aidebug"`, VS Code shows:

> Couldn't find a debug adapter descriptor for debug type 'robotframework-aidebug' (extension might have failed to activate)

### Symptom B: Launch appears to do nothing
After patching activation, starting **AI Debug Bridge: Run Current** does not reliably produce a usable/visible debug session and does not provide actionable diagnostics in the UI.

---

## Reproduction

1. Open workspace in VS Code.
2. Use launch config with:
   - `type: "robotframework-aidebug"`
   - `request: "launch"`
   - `program: "${file}"`
3. Start debugging.

Observed outcomes:
- Initially: descriptor error dialog.
- After local activation patch: no clear hard error; launch flow appears inert/intermittent.

---

## Evidence

### 1) Activation did not occur before fix
`exthost.log` showed no activation for `robotframework-aidebug` during failing launch windows, while other extensions (e.g., RobotCode) activated normally.

### 2) Manifest used non-working activation event
In extension manifest, activation event was:
- `onDebug:robotframework-aidebug`

Local patch switched this to:
- `onDebugResolve:robotframework-aidebug`

After patch + reload, `exthost.log` recorded:
- `ExtensionService#_doActivateExtension robotframework-aidebug.robotframework-aidebug-vscode ... activationEvent: 'onDebugResolve:robotframework-aidebug'`

### 3) Adapter factory does not emit diagnostics
`vscode-extension/debugAdapterFactory.js` creates `DebugAdapterExecutable` directly from settings and does not:
- resolve workspace variables explicitly,
- validate binary existence/executability,
- log start parameters,
- surface spawn failures with actionable UI messages.

### 4) Stale defaults remain in launch/config provider paths
Several defaults still point to `tests/checkout.robot` although current repo has `sample.robot` only; this increases confusion and failure risk.

---

## Root Cause Analysis

## RC-1 (Confirmed): Incorrect activation event in package manifest

### What
Extension contributed debugger type `robotframework-aidebug`, but used `onDebug:robotframework-aidebug` instead of `onDebugResolve:robotframework-aidebug`.

### Impact
Descriptor factory registration never ran at launch time, so VS Code could not find a descriptor for debug type `robotframework-aidebug`.

### Confidence
High (confirmed by before/after activation behavior and exthost activation logs).

---

## RC-2 (Probable): Adapter launch observability and path-resolution robustness gaps

### What
Adapter creation path lacks robust validation/logging and likely relies on raw config values. Workspace-style placeholders in user settings can become brittle depending on retrieval context.

### Impact
Launch can fail silently or appear inert to users, especially when executable/path resolution is wrong or process exits immediately.

### Confidence
Medium (consistent with behavior; additional instrumentation needed for definitive process-level error capture).

---

## Contributing Factors

1. **Insufficient runtime telemetry** in extension output channel during adapter creation/start.
2. **No preflight checks** for adapter executable path (`exists`, `is executable`).
3. **No explicit user-facing failure messages** when adapter process cannot be started.
4. **Stale defaults** (`tests/checkout.robot`) across manifest/provider/docs.
5. **Fallback ambiguity** with RobotCode and custom debug type in same workspace complicates user mental model.

---

## Immediate Fixes Applied Locally (Not Yet Released)

1. Changed activation event to `onDebugResolve:robotframework-aidebug` in:
   - workspace extension manifest source
   - locally installed extension manifest
2. Updated workspace debug config to run current file (`${file}`) and added fallback config for RobotCode.
3. Added workspace settings pinning adapter/backend executables to `.venv` paths.

Note: local installed-extension edits are diagnostic/workaround-level; proper fix requires publishing updated extension package.

---

## Recommended Maintainer Actions (Prioritized)

## P0

1. **Release manifest fix**
   - Use `onDebugResolve:robotframework-aidebug` (or rely on debugger contribution semantics if sufficient in tested VS Code versions).
2. **Add adapter launch preflight in factory**
   - Resolve/normalize executable path.
   - Validate file existence + executable bit.
   - Throw clear error with actionable remediation if invalid.
3. **Add high-signal output logging**
   - Log executable path + args (with safe redaction where needed).
   - Log spawn/start failures with stack and errno.

## P1

4. **Harden variable/path handling**
   - Support `${workspaceFolder}` reliably by explicit substitution against active workspace folder.
   - Document accepted path formats in settings.
5. **Unify default target paths**
   - Replace `tests/checkout.robot` defaults with a safer strategy (e.g., `${file}` in snippets, or explicit user pick).
6. **Improve UX for silent failures**
   - Show `window.showErrorMessage` with short diagnosis and “Open Output” action.

## P2

7. **Add integration tests for activation and adapter startup**
   - Test launch with debug type registration + descriptor creation.
   - Test invalid executable path handling.
   - Test current-file launch behavior.

---

## Proposed Acceptance Criteria

1. Launching a `robotframework-aidebug` configuration activates extension and starts adapter without descriptor errors on clean install.
2. Invalid adapter executable path produces immediate, actionable error message and output-channel detail.
3. `Run Current` behavior works on existing `.robot` file without stale hardcoded path assumptions.
4. CI includes at least one extension integration test covering debug activation + descriptor creation.

---

## Suggested Maintainer Verification Checklist

- [ ] Install extension from newly built VSIX on clean profile.
- [ ] Launch `robotframework-aidebug` with current file.
- [ ] Confirm activation entry in exthost log.
- [ ] Confirm adapter path/log output is emitted.
- [ ] Break adapter path intentionally and verify explicit error UX.
- [ ] Run extension tests (unit/integration) and verify pass.

---

## Affected Files (Codebase)

- `vscode-extension/package.json` (activation events)
- `vscode-extension/debugAdapterFactory.js` (adapter creation / diagnostics / path handling)
- `vscode-extension/extension.js` (embedded-session defaults and error surfacing)
- Documentation/examples that still reference `tests/checkout.robot`

---

## Closing Note

The descriptor failure has a clear and actionable fix and is high confidence resolved by manifest update. The remaining “nothing happens” behavior should be treated as an observability/robustness defect: even when startup fails for environmental reasons, users must receive immediate and specific diagnostics instead of silent non-action.

---

## Resolution Implemented In Repository

Status: Fixed locally in repository on 2026-03-09.

### Changes made

1. Manifest activation corrected to:
   - `onDebugResolve:robotframework-aidebug`
2. Adapter launch path hardened in `vscode-extension/debugAdapterFactory.js`:
   - explicit adapter path resolution
   - `${workspaceFolder}`, `${file}`, `${env:VAR}`, and `~/` substitution
   - absolute-path existence and execute-bit validation
   - output-channel diagnostics for adapter executable and args
   - explicit UI error messages with `Open Output`
3. Debug configuration resolution hardened:
   - current active `.robot` file is used by default
   - launch is rejected early with a clear message if no Robot file is active and no `program` is configured
4. Stale user-facing defaults were removed:
   - launch manifest defaults now use `${file}`
   - embedded-session command now uses the active editor file instead of `tests/checkout.robot`
   - readmes were updated accordingly
5. Regression tests added for the incident vectors:
   - manifest activation event
   - current-file default resolution
   - invalid adapter executable handling
   - path/template substitution

### Files changed for the fix

- `vscode-extension/package.json`
- `vscode-extension/debugAdapterFactory.js`
- `vscode-extension/debugLaunchConfig.js`
- `vscode-extension/extension.js`
- `vscode-extension/test/debugLaunchConfig.test.js`
- user-facing README files

## Post-Fix Validation

Commands run:

```bash
.venv/bin/python -m pytest
cd vscode-extension
npm test
npm run package:vsix
```

Results:

- Python tests: `30 passed`
- Extension tests: `12 passed`
- VSIX packaging: succeeded

## Closure

The confirmed descriptor failure is resolved by the manifest activation fix.
The previously silent or inert launch path is now guarded by preflight checks, explicit output-channel logging, and actionable error messages.
