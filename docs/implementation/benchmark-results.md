# Benchmark Results

## Scope

These numbers were collected from the implemented local reference package in this repository on 2026-03-08 using:

```bash
uv run python -m robotframework_aidebug.benchmark
```

The benchmark runner uses a high write-rate policy limit so the measurements reflect implementation cost rather than safety quota rejection.

## Results

| Operation | Iterations | Average ms | P95 ms | Notes |
|---|---:|---:|---:|---|
| `get_state` | 500 | 0.0285 | 0.0558 | compact read path |
| `variables_snapshot` | 500 | 0.0615 | 0.1211 | includes redaction and formatting |
| `execute_keyword` | 500 | 0.2605 | 0.4923 | structured keyword dispatch |
| `execute_snippet_cached` | 500 | 0.6229 | 0.9027 | repeated snippet with parser cache hit |
| `execute_snippet_cold` | 100 | 1.7435 | 2.4448 | unique snippet, parser cache miss |
| `set_variable` | 500 | 0.0393 | 0.0560 | scope mutation with audit and policy checks |

## Implemented Optimizations

1. Snippet parse cache
   - `parse_snippet()` is memoized with `lru_cache(maxsize=128)`.
   - This reduces repeated snippet execution from roughly `1.74 ms` cold to `0.62 ms` cached in the current benchmark run.

2. Compiled redaction rules
   - Redaction patterns are compiled once in the policy layer.
   - Snapshot and audit formatting reuses the compiled regex set.

3. Stable variable references
   - Nested dict and list references are cached per object identity.
   - This avoids rebuilding the entire reference graph on every lookup.

## Interpretation

The hot path in this implementation is snippet execution, not state inspection or variable access. That is expected because snippet execution performs:

- Robot snippet wrapping,
- Robot model parsing on cache miss,
- AST interpretation,
- keyword execution,
- event emission,
- audit recording.

For this local reference implementation, the current performance is already well below `1 ms` for cached snippet execution and far below that for the read-side tools, so no further optimization was required to satisfy the current scope.

## Caveats

- These are local development-machine numbers, not controlled lab results.
- They are most useful for comparing operations within this implementation rather than as absolute latency guarantees.
