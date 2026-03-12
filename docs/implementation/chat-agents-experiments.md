# Chat Agent Experiment Results

## Environment

- Date: 2026-03-09
- Command runner: `uv run --no-sync`
- Python environment: repository-local `.venv` / `uv`

## Experiment 1: Tool Payload Size Baseline

### Command

```bash
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run --no-sync python - <<'PY'
import json
from robotframework_aidebug.demo import build_demo_toolbox

toolbox = build_demo_toolbox()
state = toolbox.get_state(includeStack=True, includeScopes=True, maxLogLines=20)
small = toolbox.get_variables_snapshot(scopes=['local','test','suite','global'], max_items=5)
large = toolbox.get_variables_snapshot(scopes=['local','test','suite','global'], max_items=50)
completions = toolbox.get_runtime_completions('')
audit = toolbox.get_audit_log(limit=20)

payloads = {
    'state': state,
    'variables_small': small,
    'variables_large': large,
    'completions': completions,
    'audit': audit,
}
for name, payload in payloads.items():
    encoded = json.dumps(payload, separators=(',', ':'))
    print(f'{name}: bytes={len(encoded)} approx_tokens={len(encoded)//4}')
PY
```

### Output

```text
state: bytes=707 approx_tokens=176
variables_small: bytes=318 approx_tokens=79
variables_large: bytes=318 approx_tokens=79
completions: bytes=1579 approx_tokens=394
audit: bytes=857 approx_tokens=214
```

### Conclusion

The current helper-layer payload sizes are small enough to serve as LM or MCP tool results when bounded. Runtime completions are the heaviest common response and should keep an explicit result cap.

## Experiment 2: Helper-Layer Latency Baseline

### Command

```bash
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run --no-sync python -m robotframework_aidebug.benchmark
```

### Output Summary

```json
{
  "benchmarks": [
    {"name": "get_state", "avg_ms": 0.0537, "p95_ms": 0.1145},
    {"name": "variables_snapshot", "avg_ms": 0.1372, "p95_ms": 0.3021},
    {"name": "execute_keyword", "avg_ms": 0.2680, "p95_ms": 0.3764},
    {"name": "execute_snippet_cached", "avg_ms": 0.9172, "p95_ms": 1.8203},
    {"name": "execute_snippet_cold", "avg_ms": 2.6249, "p95_ms": 3.3515},
    {"name": "set_variable", "avg_ms": 0.0791, "p95_ms": 0.1183}
  ]
}
```

### Conclusion

Local helper costs are low enough that the dominant latency concerns for chat-agent integration will be host orchestration, transport overhead, confirmation UX, and result shaping.

## Design Impact

1. Completion and audit tools need explicit result caps.
2. LM tool token budgets should be enforced from the application layer rather than left to host heuristics.
3. Streaming or progress messages matter more for orchestration and bridge latency than for local helper execution.
