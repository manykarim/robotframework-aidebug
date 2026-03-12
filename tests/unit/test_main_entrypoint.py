from __future__ import annotations

import runpy


def test_module_entrypoint_executes_without_crashing(monkeypatch) -> None:
    monkeypatch.setattr('robotframework_aidebug.cli.main', lambda: 0)
    try:
        runpy.run_module('robotframework_aidebug.__main__', run_name='__main__')
    except SystemExit as exc:
        assert exc.code == 0
