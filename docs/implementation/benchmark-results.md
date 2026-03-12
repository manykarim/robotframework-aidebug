# Benchmark Results

## Command

```bash
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run --no-sync python -m robotframework_aidebug.benchmark
```

## Latest Results

| Operation | Average ms | P95 ms | Max ms |
|---|---:|---:|---:|
| `get_state` | 0.0208 | 0.0252 | 0.4558 |
| `variables_snapshot` | 0.0532 | 0.0691 | 0.1144 |
| `execute_keyword` | 0.1789 | 0.2164 | 5.4368 |
| `execute_page_script` | 0.0320 | 0.0441 | 0.4865 |
| `execute_snippet_cached` | 0.5549 | 0.7496 | 1.9666 |
| `execute_snippet_cold` | 1.5213 | 2.0226 | 2.1375 |
| `set_variable` | 0.0398 | 0.0538 | 0.6214 |

## MCP Surface Roundtrip Baseline

Command:

```bash
uv run --no-sync python - <<'PY'
# benchmark MCP stdio and streamable HTTP get_state roundtrips
PY
```

Latest measured results:

| Operation | Average ms | P95 ms |
|---|---:|---:|
| `mcp_stdio_get_state` | 7.342 | 14.787 |
| `mcp_http_get_state` | 11.949 | 43.621 |

## Interpretation

1. Local helper-layer state reads and variable operations remain comfortably below interactive thresholds.
2. MCP roundtrip overhead dominates helper-layer cost, which is expected for agent-facing integrations.
3. The structured page-script helper is cheaper than generic snippet execution because it avoids parsing Robot control flow.
4. Snippet parsing is still the dominant cold-path helper cost.
5. The meaningful latency budget for live sessions is now transport, synchronization, host orchestration, and UI overhead rather than the core helper logic.
6. The selector-suite fixes did not introduce a hot-path regression; plain-first keyword fallback and structured page-script execution reduce avoidable retry work in common Browser flows.

## Optimizations Retained

- snippet parse caching
- compiled redaction rules
- stable nested reference reuse
- lightweight capability probing and cache-backed event summaries
- bounded payload shaping for LM and MCP tool surfaces
