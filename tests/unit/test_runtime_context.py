from __future__ import annotations

from robotframework_aidebug.demo import build_demo_toolbox


def test_runtime_context_returns_namespace_and_completions() -> None:
    toolbox = build_demo_toolbox()
    payload = toolbox.get_runtime_context(text="Log", includeCompletions=True, includeNamespaceSummary=True, maxItems=10)
    assert payload["frameId"] == 1
    assert payload["stoppedKeyword"] == "Verify totals"
    assert payload["namespaceSummary"]["libraries"] == ["BuiltIn"]
    assert any(item["label"] == "Log" for item in payload["completions"])


def test_variable_snapshot_supports_exact_name_and_paging() -> None:
    toolbox = build_demo_toolbox()
    exact = toolbox.get_variables_snapshot(scopes=["suite"], names=["${base_url}"], max_items=10)
    assert exact["variables"]["suite"] == {"${base_url}": "'https://example.test'"}

    paged = toolbox.get_variables_snapshot(scopes=["global"], start=0, max_items=1)
    assert paged["variables"]["global"] == {"${api_token}": "<redacted>"}
    assert paged["truncated"] is True
    assert paged["nextStart"] == 1


def test_execute_page_script_accepts_raw_js_templates_without_robot_interpolation() -> None:
    toolbox = build_demo_toolbox()
    payload = toolbox.execute_page_script("return `${CSS.escape(el.id)}`;", "body", ["${selectors}"])
    assert payload["status"] == "PASS"
    assert payload["selector"] == "body"
    assert payload["assigned"]["${selectors}"].startswith("{'selector': 'body'")
