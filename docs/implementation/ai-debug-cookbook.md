# AI Debug Cookbook

## Purpose

This cookbook captures known-good patterns for live AI-assisted Robot Framework debugging after the March 9, 2026 retrospective fixes.

## Keyword Execution

### Run a plain keyword

Use `execute_keyword` with the keyword name exactly as Robot Framework expects it:

```json
{
  "keyword": "Get Page Source",
  "args": [],
  "assign": []
}
```

### Run a library-qualified keyword

```json
{
  "keyword": "Browser.Get Page Source",
  "args": [],
  "assign": []
}
```

### Capture the result into a variable

Use `assign` as an array of Robot variable names:

```json
{
  "keyword": "Get Page Source",
  "args": [],
  "assign": ["${page_source}"]
}
```

Notes:

- The transport now sends plain Robot REPL syntax first.
- Legacy `! ...` syntax is used only as a compatibility fallback.
- Invalid `assign` shapes return `ARGUMENT_SHAPE_ERROR` instead of surfacing as keyword lookup failures.

## Large Variable Retrieval

### Fetch one exact variable

```json
{
  "scopes": ["local"],
  "names": ["${page_source}"],
  "max_items": 10
}
```

### Page through a large scope

First call:

```json
{
  "scopes": ["local"],
  "start": 0,
  "max_items": 20
}
```

If the response contains `"truncated": true` and `"nextStart": 20`, continue with:

```json
{
  "scopes": ["local"],
  "start": 20,
  "max_items": 20
}
```

## Browser Library JavaScript

### Preferred helper: `execute_page_script`

Use `execute_page_script` for page-scoped Browser JavaScript:

```json
{
  "selector": "body",
  "script": "return `${CSS.escape(el.id)}`;",
  "assign": ["${selectors}"]
}
```

Notes:

- The bridge transport escapes raw `${...}` sequences before sending the call through Robot REPL fallback paths.
- The helper tries plain `Evaluate JavaScript` syntax first and only uses legacy `! ...` compatibility syntax if needed.
- If the helper fails with `KEYWORD_NOT_FOUND`, the surfaced error now preserves the plain keyword name rather than a synthetic `! ...` variant.

### Snippet fallback

When direct keyword execution is awkward and you need multi-step logic, prefer `execute_snippet` with an explicit page-scoped selector.

```robot
${result}=    Evaluate JavaScript    body    () => {
...    return document.title;
...  }
Log    ${result}
```

Guidelines:

- Use `body` as the selector when you want page-scoped evaluation.
- Keep the JavaScript body small and self-contained.
- If the JavaScript contains complex quoting or regular expressions, simplify the snippet first and then expand it.
- Prefer `Should Be Equal As Integers` for numeric assertions derived from Browser JavaScript results.

## Selector Validation Suite

The repository includes a reproducible Browser selector-validation suite:

- [validate_interactable_selectors.robot](/home/many/workspace/robotframework-aidebug/validate_interactable_selectors.robot)

Run it with:

```bash
uv run --no-sync robot validate_interactable_selectors.robot
```

This suite is also exercised by [test_selector_suite.py](/home/many/workspace/robotframework-aidebug/tests/e2e/test_selector_suite.py).

## Error Handling

The current transport and agent surfaces now distinguish these common failure classes:

- `KEYWORD_NOT_FOUND`
- `ARGUMENT_SHAPE_ERROR`
- `SELECTOR_TIMEOUT`
- `JS_EVAL_ERROR`
- `POLICY_MODE_DENIED`
- `WORKSPACE_TRUST_REQUIRED`
- `MUTATION_REQUIRES_PAUSED_SESSION`
- `SESSION_NOT_FOUND`

Recommended retry strategy:

1. Retry only for session-availability, queue, or timeout conditions.
2. Do not blind-retry `KEYWORD_NOT_FOUND`.
3. Narrow the request for `ARGUMENT_SHAPE_ERROR` and `JS_EVAL_ERROR`.
4. Use exact-name variable retrieval instead of repeating large snapshot calls.
