from __future__ import annotations

import json

from robotframework_aidebug.cli import main


def test_cli_demo_outputs_payload(capsys) -> None:
    rc = main(["demo"])
    payload = json.loads(capsys.readouterr().out)
    assert rc == 0
    assert payload["state"]["state"] == "paused"


def test_cli_benchmark_outputs_benchmarks(capsys) -> None:
    rc = main(["benchmark", "--iterations", "5"])
    payload = json.loads(capsys.readouterr().out)
    assert rc == 0
    assert payload["benchmarks"]
