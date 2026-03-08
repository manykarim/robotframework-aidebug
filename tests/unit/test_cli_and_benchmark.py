from __future__ import annotations

import json

from robotframework_aidebug.cli import main
from robotframework_aidebug.benchmark import run_benchmarks


def test_main_outputs_demo_payload(capsys) -> None:
    main(["demo"])
    captured = capsys.readouterr().out
    payload = json.loads(captured)
    assert payload["state"]["state"] == "paused"
    assert payload["executeSnippet"]["status"] == "OK"


def test_benchmark_runner_returns_measurements() -> None:
    payload = run_benchmarks(iterations=20)
    names = {entry["name"] for entry in payload["benchmarks"]}
    assert {"get_state", "variables_snapshot", "execute_keyword", "execute_snippet_cached", "execute_snippet_cold", "set_variable"} <= names
    assert all(entry["avg_ms"] >= 0 for entry in payload["benchmarks"])
