# AI Debug Session Retrospective (Maintainer Report)

Date: 2026-03-09  
Workspace: `robotframework-aidebug`  
Primary target: Robot Framework AI Debug maintainers

## Executive Summary

This session demonstrated that the AI debug surface is already valuable for real-time investigation (session state, stack context, snippet execution), but the current keyword-execution ergonomics and result transport behavior introduce unnecessary friction for agentic workflows.

In short:

- **What worked well:** session introspection (`get_state`) and snippet execution (`execute_snippet`) were reliable and fast.
- **What broke repeatedly:** direct keyword execution (`execute_keyword`) and Browser JS invocation ergonomics had non-obvious failure modes.
- **What caused the most overhead:** large result retrieval (`get_variables_snapshot`) truncation requiring side-channel file reads.

The issues are fixable with targeted API/UX improvements and clearer contract-level behavior.

---

## Session Goals and Outcomes

### Goals attempted

1. Confirm access to current live debug session.
2. Retrieve current browser page source.
3. Generate CSS selectors for interactable elements.
4. Validate selectors using Browser Library primitives.
5. Report operational pain points and improvements.

### Outcomes

- Goal 1: **Succeeded** (`get_state` returned paused frame in `sample.robot`).
- Goal 2: **Partially succeeded** (page source retrieved, but large values were truncated in variable snapshot output).
- Goal 3: **Succeeded** (67 unique selectors generated).
- Goal 4: **Succeeded** (67/67 selectors validated with count > 0).
- Goal 5: **Succeeded** (this report).

---

## What Worked Well

1. **Session state access was immediate and actionable**
   - `get_state` returned pause reason, current frame, source path, line, and recent Robot lifecycle events.
   - This gave enough context to continue debugging without switching tools.

2. **`execute_snippet` acted as a reliable fallback execution surface**
   - When keyword execution failed, snippets allowed multi-step operations in one bounded call.
   - Snippet execution enabled JS evaluation + selector generation + per-selector validation loops.

3. **Tool latency was generally acceptable for interactive debugging**
   - Most calls completed in tens to hundreds of milliseconds, with the exception of one timed-out Browser evaluate path.

---

## Issues Encountered (Detailed)

## Issue 1: `execute_keyword` appears to mutate keyword text (leading `!`)

### Symptoms

- Calling `execute_keyword` with:
  - `Get Page Source`
  - `Browser.Get Page Source`
  resulted in errors like:
  - `No keyword with name '! Get Page Source' found.`
  - `No keyword with name '! Browser.Get Page Source' found.`

### Impact

- Direct keyword execution became unusable for otherwise valid keywords.
- Forced fallback to `execute_snippet`, increasing complexity and token/tool usage.

### Suggested root cause

- Potential transport/parser prefix handling bug where an internal marker (`!`) is being prepended before keyword resolution.

### Recommendations

- Normalize/strip control markers before Robot keyword dispatch.
- Include raw and normalized keyword names in error payload for diagnosability.
- Add a regression test for plain keywords and library-qualified keywords.

---

## Issue 2: Assignment syntax behavior in `execute_keyword` is unclear

### Symptoms

- Attempting assignment via `assign` caused:
  - `No keyword with name '! ${page_source}=' found.`

### Impact

- Agents cannot safely infer expected argument shape for output assignment.
- Repeated trial-and-error is required in a paused debugging context.

### Recommendations

- Document and enforce one canonical assignment mechanism.
- Validate `assign` structure server-side and return explicit contract errors (not keyword-not-found).
- Add examples in docs for `execute_keyword` output capture.

---

## Issue 3: Browser `Evaluate JavaScript` invocation ergonomics are easy to misuse

### Symptoms observed during iteration

1. Passing `None` selector produced `locator('None')` timeout.
2. Omitting selector produced selector parse error against `() => { ... }`.
3. One iteration hit `Invalid regular expression flags` due escaping friction in multiline JS inside Robot snippet context.

### Impact

- High iteration cost to discover a valid call shape (`body` selector + function argument).
- Risk of misdiagnosing library/runtime behavior when failure is argument-shape related.

### Recommendations

- Provide a higher-level helper in AI Debug for page-scoped JS eval (no selector required by caller).
- Add keyword-shape guidance in error messages (expected arity/position hints).
- Include tested recipes for Browser JS execution inside snippet mode.

---

## Issue 4: Large variable payloads are truncated in `get_variables_snapshot`

### Symptoms

- Large structures (`@{selectors}`, `&{selector_summary}`, page source) were truncated.
- Retrieval required reading an intermediate generated JSON file from workspace storage.

### Impact

- Breaks normal tool contract flow for agents.
- Requires extra file-system hops and out-of-band handling for complete results.

### Recommendations

- Add explicit paging/continuation API for large variable payloads.
- Offer targeted selectors (e.g., fetch only one variable by exact name).
- Provide machine-readable truncation metadata with deterministic next-call parameters.

---

## Issue 5: Error taxonomy is too generic (`INTERNAL_ERROR`)

### Symptoms

- Different failure classes (parse issue, bad keyword shape, selector timeout, JS syntax issues) surfaced as `INTERNAL_ERROR`.

### Impact

- Harder to implement robust agent retry strategies.
- Encourages brittle heuristics instead of deterministic handling.

### Recommendations

- Introduce typed error classes (e.g., `KEYWORD_NOT_FOUND`, `ARGUMENT_SHAPE_ERROR`, `SELECTOR_TIMEOUT`, `JS_EVAL_ERROR`, `PAYLOAD_TRUNCATED`).
- Preserve original subsystem details in structured fields.

---

## Quantitative Snapshot

- Interactable selectors generated: **67**
- Selectors validated via Browser element count: **67/67 valid**
- Invalid selectors after validation: **0**
- Session state access: **successful**
- Direct keyword execution reliability in this session: **failed for tested page-source calls**

---

## Prioritized Improvement Plan

## P0 (High Priority)

1. Fix `execute_keyword` keyword normalization/parsing (remove unintended `!` prefix effects).
2. Clarify and validate assignment semantics for `execute_keyword`.
3. Add robust typed error codes instead of broad `INTERNAL_ERROR`.

## P1

4. Add large-payload continuation/pagination to variable snapshot APIs.
5. Add high-level convenience API for page source retrieval and page-scoped JS evaluation.
6. Improve Browser-related diagnostics with argument-shape hints.

## P2

7. Publish an “AI Debug cookbook” with known-good patterns:
   - keyword execution
   - snippet fallback templates
   - Browser JS evaluation patterns
   - large-result retrieval patterns

---

## Suggested Acceptance Criteria

1. `execute_keyword` can run `Get Page Source` and `Browser.Get Page Source` without string mutation artifacts.
2. Assignment behavior is documented and validated with contract-level errors.
3. Agents can retrieve full large variable values via paged API, without out-of-band storage file reads.
4. Error codes are specific enough to support deterministic retry/remediation logic.
5. Maintainer docs include at least one end-to-end AI debugging example for Browser Library workflows.

---

## Closing Assessment

The platform is close to being highly effective for AI-assisted Robot debugging. The core session bridge and snippet execution are strong. Most friction came from **contract ergonomics and diagnostics**, not from fundamental execution capability. Addressing the P0 items should materially improve reliability and reduce agent iteration loops in real debugging sessions.

---

## Resolution Status (Implemented 2026-03-09)

### Root cause confirmed

1. The debug-session fallback path in [vscode-extension/transports.js](/home/many/workspace/robotframework-aidebug/vscode-extension/transports.js) built `execute_keyword` REPL expressions with a leading `!`, which caused valid keywords to fail on some live sessions.
2. The extension manifest in [vscode-extension/package.json](/home/many/workspace/robotframework-aidebug/vscode-extension/package.json) still exposed stale launch defaults and had not been aligned with the newer chat-agent and MCP surface already present in code.
3. The variable-snapshot surface supported bounded output but did not yet expose exact-name filtering and deterministic paging end to end through the agent-facing transport.

### What was changed

1. `execute_keyword` now sends plain Robot syntax first and uses legacy `! ...` syntax only as a compatibility fallback.
2. `execute_keyword` validates `keyword`, `args`, and `assign` input shape and returns typed errors instead of keyword-mutation side effects.
3. Assignment capture is now covered by regression tests and returned in a predictable `assigned` payload.
4. `get_variables_snapshot` now supports:
   - exact-name filtering through `names`
   - deterministic paging through `start`
   - machine-readable continuation metadata through `truncated` and `nextStart`
5. Chat-agent dispatch now forwards `names` and `start` correctly to the transport.
6. The extension manifest now:
   - defaults embedded launch configurations to `${file}`
   - packages the missing chat-agent modules
   - contributes LM tools, chat participant metadata, and MCP server-definition provider metadata

### Validation completed

- Python: `41 passed`, `86%` coverage
- Extension: `26 passed`
- VSIX packaging: verified
- VSIX installation: verified
- Focused regression suites:
  - keyword normalization and compatibility fallback
  - assignment capture
  - exact-name variable retrieval
  - paged variable retrieval

### Benchmark outcome

Latest helper-layer results after the fix:

- `get_state`: `0.0207 ms`
- `variables_snapshot`: `0.0477 ms`
- `execute_keyword`: `0.1768 ms`
- `execute_snippet_cached`: `0.5464 ms`
- `execute_snippet_cold`: `1.5649 ms`
- `set_variable`: `0.0445 ms`

The retrospective fix did not introduce a measurable regression on the core helper paths.

### Follow-up documentation

- Cookbook added: [docs/implementation/ai-debug-cookbook.md](/home/many/workspace/robotframework-aidebug/docs/implementation/ai-debug-cookbook.md)
- Validation report updated: [docs/implementation/validation.md](/home/many/workspace/robotframework-aidebug/docs/implementation/validation.md)
- Benchmark report updated: [docs/implementation/benchmark-results.md](/home/many/workspace/robotframework-aidebug/docs/implementation/benchmark-results.md)
