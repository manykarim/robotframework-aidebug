# Benchmark Results

## Command

```bash
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run --no-sync python -m robotframework_aidebug.benchmark
```

## Latest Results

| Operation | Average ms | P95 ms | Max ms |
|---|---:|---:|---:|
| `get_state` | 0.0265 | 0.0360 | 0.6329 |
| `variables_snapshot` | 0.0439 | 0.0587 | 0.1226 |
| `execute_keyword` | 0.1648 | 0.1863 | 5.5252 |
| `execute_snippet_cached` | 0.5693 | 0.8732 | 2.1872 |
| `execute_snippet_cold` | 1.5673 | 2.0770 | 2.4229 |
| `set_variable` | 0.0393 | 0.0534 | 0.5526 |

## Interpretation

1. Local helper-layer state reads and variable operations remain comfortably below interactive thresholds.
2. Snippet parsing is still the dominant cold-path cost.
3. The meaningful latency budget for live sessions is now transport, synchronization, and UI overhead rather than the core helper logic.

## Optimizations Retained

- snippet parse caching
- compiled redaction rules
- stable nested reference reuse
- lightweight capability probing and cache-backed event summaries
