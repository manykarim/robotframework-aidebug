# AI Debug Maintainer Report: Selector Validation Session

Date: 2026-03-09  
Workspace: `robotframework-aidebug`  
Audience: Robot Framework AI Debug maintainers

## Executive Summary

This session validated that the AI Debug surface can successfully drive real Browser Library work in a paused runtime and support end-to-end selector quality checks. It also exposed several reliability and ergonomics gaps that increase agent iteration cost.

Key outcomes:

- Built and ran a new Robot suite: [validate_interactable_selectors.robot](../../validate_interactable_selectors.robot)
- Suite result: `1 passed, 0 failed`
- AI Debug runtime validation: interactable selectors generated and validated (`invalidCount = 0`, `total = 56`)
- Main friction points: JavaScript-in-snippet escaping pitfalls, intermittent `!` keyword mutation behavior, and truncation of large return payload representations

## Session Objectives

1. Generate CSS selectors for all interactable elements on the active page.
2. Confirm selectors are valid using AI Debug runtime execution.
3. Convert the outcome into a reusable `.robot` suite that validates each element.
4. Capture operational pain points and maintainer recommendations.

Status: all objectives achieved.

## What Worked Well

- `get_state` and `get_capabilities` quickly confirmed a usable paused session in `sample.robot`.
- `execute_snippet` reliably executed Browser `Evaluate JavaScript` logic once expression-shape issues were corrected.
- `execute_keyword` (when successful) handled Browser library keywords and assignment capture well enough to prove selector validity.
- Converting discovery logic into a deterministic Robot suite was straightforward and yielded a passing run.

## Detailed Timeline

1. Initial request targeted Browser Library validation of interactable selectors.
2. Requirement changed to use AI Debug Library/tool surface.
3. Verified active paused session via `get_state` and capability surface.
4. Iterated on JS execution for selector generation and validity checks.
5. Encountered multiple failure classes (variable interpolation, JS parser errors, assertion type mismatch, intermittent keyword mutation with `!`).
6. Stabilized the JS strategy and confirmed validity (`invalidCount = 0`).
7. Authored new suite [validate_interactable_selectors.robot](../../validate_interactable_selectors.robot) to validate each discovered element.
8. Executed suite with Robot CLI; run passed.

## Issues Encountered

## Issue 1: Robot variable interpolation conflicts inside JS bodies

### Symptoms

`execute_snippet` failed when JS template literals contained expressions like `${CSS.escape(el.id)}` because Robot interpreted `${...}` as Robot variable syntax.

### Impact

- Broke otherwise valid JS logic.
- Required non-obvious rewriting style for JS strings.

### Recommendation

- Add explicit transport-level escape guidance in docs for JS snippet content.
- Consider a “raw JS payload” mode that bypasses Robot variable interpolation.

## Issue 2: JS parser fragility from complex escaping in snippet context

### Symptoms

Several `execute_snippet` attempts failed with syntax errors while building escaped regex/string utilities in inline JS.

### Impact

- Increased iteration count and debugging time.
- Encouraged simplification over robust selector construction logic.

### Recommendation

- Add a helper API for page-scoped JS execution with structured arguments instead of free-form multiline Robot snippet text.
- Publish “known-safe” snippet patterns for Browser eval with escaping examples.

## Issue 3: Assertion type mismatch ergonomics

### Symptoms

`Should Be Equal` compared `0 (integer)` vs `0 (string)` and failed despite semantically equivalent values.

### Impact

- False-negative assertion failure in otherwise correct validation flow.

### Recommendation

- In examples/docs, consistently use `Should Be Equal As Integers` for numeric checks returned from JS.
- Optionally provide typed coercion helpers in AI Debug recipes.

## Issue 4: Intermittent keyword mutation (`!`) still observed in live execution path

### Symptoms

Some `execute_keyword` calls failed with:

- `No keyword with name '! Evaluate JavaScript' found.`
- `No keyword with name '! Browser.Evaluate JavaScript' found.`

while earlier `execute_keyword` calls in the same session succeeded.

### Impact

- Suggests intermittent or path-dependent fallback/formatting behavior.
- Reduces determinism for agentic execution plans.

### Recommendation

- Add trace-level diagnostics on keyword normalization path (pre/post transformation) for every execute call.
- Add regression coverage for mixed successful/failed sequences in one session.
- Ensure fallback strategy cannot prepend legacy marker on first-attempt payloads when not required.

## Issue 5: Large return payloads are representation-truncated

### Symptoms

`returnValueRepr` for selector arrays/maps was elided with `...`, which limits direct extraction of all selectors from one call.

### Impact

- Makes post-processing harder for agents without additional retrieval patterns.

### Recommendation

- Provide explicit large-result retrieval contracts (chunked return handles, paging token, or value-by-reference retrieval).
- Document best-practice for storing large results into variables and retrieving by exact name.

## Improvements Implemented During Session

- Added [validate_interactable_selectors.robot](../../validate_interactable_selectors.robot) with:
  - interactable-element discovery
  - deterministic selector generation
  - per-element validation through Browser keywords
  - identity check using `data-rf-index`
- Verified suite execution result: pass.

## Suggested Product Improvements (Prioritized)

## P0

1. Eliminate intermittent `!` keyword mutation path entirely (or make behavior fully deterministic with explicit compatibility mode).
2. Introduce structured page-JS execution API that avoids fragile snippet quoting/escaping.
3. Improve numeric/type assertion guidance in official recipes to avoid avoidable false failures.

## P1

4. Add richer typed error taxonomy for JS parsing/interpolation/argument-shape errors.
5. Add large-result retrieval primitives to avoid lossy `repr`-only consumption.
6. Ship a maintainer-endorsed recipe for “discover + validate all interactable selectors”.

## P2

7. Add session diagnostics command to emit execution-path metadata (bridge path, fallback mode used, keyword normalization mode).
8. Add “copy as reproducible snippet” support for failed snippet/keyword invocations.

## Proposed Acceptance Criteria

1. `execute_keyword` never emits keyword names prefixed with `!` unless an explicit legacy mode is requested.
2. Page-scoped JS can be executed via structured API without Robot-variable interpolation conflicts.
3. Large selector payloads can be retrieved losslessly through supported continuation/reference semantics.
4. Official docs include a validated example that discovers and validates all interactable elements on a page.
5. End-to-end test reproduces this session workflow and passes in CI.

## Reproducibility Notes

- Source under debug: [sample.robot](../../sample.robot)
- New suite created: [validate_interactable_selectors.robot](../../validate_interactable_selectors.robot)
- CLI verification run produced passing output in local workspace.

## Closing Assessment

The current AI Debug system is operationally strong for session introspection and bounded runtime execution, and it can support real automation maintenance tasks. The most significant remaining gaps are not core capability gaps; they are contract ergonomics and deterministic execution-path behavior. Addressing these would substantially reduce agent retries and improve maintainer confidence in production debugging workflows.

---

## Resolution Status (Implemented 2026-03-09)

### What was fixed

1. Added a structured page-script helper across the local architecture:
   - backend/session dispatch
   - extension transport
   - LM tools
   - chat participant routing
   - MCP surface
2. The bridge transport now escapes raw `${...}` sequences before falling back through Robot REPL evaluation for page-script execution.
3. Legacy `! ...` fallback can still be attempted for compatibility, but surfaced user-visible failures now preserve the plain keyword form rather than leaking synthetic `! ...` names.
4. Added numeric assertion support in the local keyword registry through `Should Be Equal As Integers`.
5. Turned the selector-validation suite into a real end-to-end test path.

### New artifacts

- Structured helper cookbook updates: [docs/implementation/ai-debug-cookbook.md](/home/many/workspace/robotframework-aidebug/docs/implementation/ai-debug-cookbook.md)
- Reusable selector suite: [validate_interactable_selectors.robot](/home/many/workspace/robotframework-aidebug/validate_interactable_selectors.robot)
- E2E regression: [tests/e2e/test_selector_suite.py](/home/many/workspace/robotframework-aidebug/tests/e2e/test_selector_suite.py)

### Validation completed

- `uv run --no-sync robot validate_interactable_selectors.robot`: passed
- Python: `43 passed`, `86%` coverage
- Extension: `30 passed`
- VSIX packaging: verified
- VSIX installation: verified

### Benchmark outcome

Latest helper-layer results include the new structured page-script path:

- `execute_keyword`: `0.1789 ms`
- `execute_page_script`: `0.0320 ms`
- `execute_snippet_cached`: `0.5549 ms`

For the local reference implementation, the structured page-script helper is substantially cheaper than snippet execution because it bypasses Robot snippet parsing.
