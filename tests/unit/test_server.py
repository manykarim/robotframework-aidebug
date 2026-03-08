from __future__ import annotations

from robotframework_aidebug import AgentDebugError


def test_get_state_returns_expected_snapshot(toolbox) -> None:
    state = toolbox.get_state(includeStack=True, includeScopes=False)
    assert state["state"] == "paused"
    assert state["topFrame"]["name"] == "Verify totals"
    assert state["currentItem"]["type"] == "keyword"


def test_scopes_and_variables_traversal_support_nested_objects(toolbox) -> None:
    state = toolbox.get_state()
    scopes = toolbox.get_scopes(state["topFrame"]["id"])
    test_ref = scopes["scopes"][1]["variablesReference"]
    variables = toolbox.get_variables(test_ref)
    items_entry = next(item for item in variables["variables"] if item["name"] == "${items}")
    nested = toolbox.get_variables(items_entry["variablesReference"])
    assert [item["value"] for item in nested["variables"]] == ["'apple'", "'pear'"]


def test_evaluate_uses_robot_expression_rules(toolbox) -> None:
    result = toolbox.evaluate("$retry_count + 2")
    assert result["rawResult"] == 3


def test_set_variable_updates_scope_and_audits(toolbox) -> None:
    state = toolbox.get_state()
    local_ref = toolbox.get_scopes(state["topFrame"]["id"])["scopes"][0]["variablesReference"]
    result = toolbox.set_variable(local_ref, "${status}", "'RECOVERED'")
    assert result["value"] == "'RECOVERED'"
    session = toolbox.router.active_server().session
    assert session.get_variable_value("${status}") == "RECOVERED"
    assert session.data.audit_log[-1].command == "setVariable"


def test_read_only_write_is_rejected(read_only_toolbox) -> None:
    state = read_only_toolbox.get_state()
    local_ref = read_only_toolbox.get_scopes(state["topFrame"]["id"])["scopes"][0]["variablesReference"]
    try:
        read_only_toolbox.set_variable(local_ref, "${status}", "'RECOVERED'")
    except AgentDebugError as exc:
        assert exc.code == "read_only"
    else:
        raise AssertionError("Expected read-only mutation to fail")
