from __future__ import annotations

from robotframework_aidebug.snippets import clear_snippet_cache, parse_snippet, wrap_snippet


def test_wrap_snippet_creates_robot_test_case_envelope() -> None:
    wrapped = wrap_snippet("Log    hi")
    assert wrapped.startswith("*** Test Cases ***")
    assert "    Log    hi" in wrapped


def test_parse_snippet_supports_control_flow_and_cache() -> None:
    clear_snippet_cache()
    nodes = parse_snippet("IF    True\n    Log    hi\nEND")
    assert [type(node).__name__ for node in nodes] == ["If"]
    cache_info_before = parse_snippet.cache_info()
    parse_snippet("IF    True\n    Log    hi\nEND")
    cache_info_after = parse_snippet.cache_info()
    assert cache_info_after.hits == cache_info_before.hits + 1
