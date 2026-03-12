from __future__ import annotations

import json
import statistics
import time
from typing import Any

from .demo import build_demo_toolbox
from .models import PolicyConfig
from .snippets import clear_snippet_cache


def _measure(name: str, func: Any, iterations: int = 500) -> dict[str, float]:
    samples: list[float] = []
    for _ in range(25):
        func()
    for _ in range(iterations):
        started = time.perf_counter()
        func()
        samples.append((time.perf_counter() - started) * 1000.0)
    return {
        "name": name,
        "iterations": float(iterations),
        "avg_ms": statistics.fmean(samples),
        "p95_ms": statistics.quantiles(samples, n=20)[18],
        "min_ms": min(samples),
        "max_ms": max(samples),
    }


def run_benchmarks(iterations: int = 500) -> dict[str, Any]:
    toolbox = build_demo_toolbox(policy=PolicyConfig(max_write_actions_per_minute=100_000))
    state = toolbox.get_state()
    scopes = toolbox.get_scopes(state["topFrame"]["id"])
    local_ref = scopes["scopes"][0]["variablesReference"]
    clear_snippet_cache()
    cold_counter = {"index": 0}

    def cold_snippet() -> None:
        cold_counter["index"] += 1
        toolbox.execute_snippet(
            f"${{value}}=    Set Variable    {cold_counter['index']}\n"
            f"IF    $value > 0\n"
            f"    Log    cold\n"
            f"END"
        )

    results = [
        _measure("get_state", lambda: toolbox.get_state(), iterations),
        _measure(
            "variables_snapshot",
            lambda: toolbox.get_variables_snapshot(scopes=["local", "test", "suite", "global"], max_items=20),
            iterations,
        ),
        _measure(
            "execute_keyword",
            lambda: toolbox.execute_keyword("Log", ["benchmark message"]),
            iterations,
        ),
        _measure(
            "execute_page_script",
            lambda: toolbox.execute_page_script("return `${CSS.escape(el.id)}`;", "body"),
            iterations,
        ),
        _measure(
            "execute_snippet_cached",
            lambda: toolbox.execute_snippet("${x}=    Set Variable    1\nIF    $x == 1\n    Log    cached\nEND"),
            iterations,
        ),
        _measure("execute_snippet_cold", cold_snippet, max(50, iterations // 5)),
        _measure(
            "set_variable",
            lambda: toolbox.set_variable(local_ref, "${benchmark}", "123"),
            iterations,
        ),
    ]
    return {"benchmarks": results}


if __name__ == "__main__":
    print(json.dumps(run_benchmarks(), indent=2))
