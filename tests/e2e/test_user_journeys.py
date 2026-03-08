from __future__ import annotations

import pytest

from robotframework_aidebug import AgentDebugError


def test_full_control_user_journey_recovers_session(toolbox) -> None:
    state = toolbox.get_state(includeStack=True, includeScopes=True)
    assert state["state"] == "paused"
    assert state["topFrame"]["line"] == 28

    snapshot = toolbox.get_variables_snapshot(scopes=["local", "test", "suite", "global"], max_items=20)
    assert snapshot["variables"]["suite"]["${password}"] == "<redacted>"
    assert snapshot["variables"]["global"]["${api_token}"] == "<redacted>"

    local_ref = state["scopes"][0]["variablesReference"]
    test_ref = state["scopes"][1]["variablesReference"]

    toolbox.set_variable(local_ref, "${status}", "'RECOVERED'")
    toolbox.execute_keyword("Set Suite Variable", ["${recovery_flag}", "ready"])
    toolbox.execute_keyword("Set Global Variable", ["${release_gate}", "green"])

    snippet = "\n".join(
        [
            "FOR    ${fruit}    IN    kiwi    mango",
            "    Append To List    ${items}    ${fruit}",
            "END",
            "${summary}=    Catenate    ${status}    ${order_id}",
            "IF    $retry_count == 1",
            "    ${retry_count}=    Set Variable    2",
            "END",
            "Log    Recovery complete",
        ]
    )
    snippet_result = toolbox.execute_snippet(snippet)
    assert snippet_result["status"] == "OK"

    test_vars = toolbox.get_variables(test_ref)
    items_entry = next(item for item in test_vars["variables"] if item["name"] == "${items}")
    nested_items = toolbox.get_variables(items_entry["variablesReference"])
    assert [item["value"] for item in nested_items["variables"]] == ["'apple'", "'pear'", "'kiwi'", "'mango'"]

    refreshed = toolbox.get_variables_snapshot(scopes=["local", "suite", "global"], max_items=20)
    assert refreshed["variables"]["local"]["${status}"] == "'RECOVERED'"
    assert refreshed["variables"]["local"]["${summary}"] == "'RECOVERED A-1042'"
    assert refreshed["variables"]["local"]["${retry_count}"] == "2"
    assert refreshed["variables"]["suite"]["${recovery_flag}"] == "'ready'"
    assert refreshed["variables"]["global"]["${release_gate}"] == "'green'"

    running = toolbox.control("continue")
    assert running["state"] == "running"
    paused = toolbox.control("pause")
    assert paused["state"] == "paused"

    session = toolbox.router.active_server().session
    assert any(entry.command == "robot/executeSnippet" for entry in session.data.audit_log)
    assert any(event.event == "robot/agentAction" for event in session.data.recent_events)


def test_read_only_user_journey_is_safe(read_only_toolbox) -> None:
    state = read_only_toolbox.get_state()
    assert state["state"] == "paused"
    snapshot = read_only_toolbox.get_variables_snapshot(scopes=["local", "suite"], max_items=10)
    assert snapshot["variables"]["suite"]["${password}"] == "<redacted>"

    with pytest.raises(AgentDebugError, match="fullControl"):
        read_only_toolbox.execute_keyword("Log", ["should fail"])

    with pytest.raises(AgentDebugError, match="fullControl"):
        read_only_toolbox.execute_snippet("Log    should fail")


def test_deep_navigation_journey_supports_nested_edits_and_stepping(toolbox) -> None:
    state = toolbox.get_state()
    scopes = toolbox.get_scopes(state["topFrame"]["id"])
    test_ref = scopes["scopes"][1]["variablesReference"]

    variables = toolbox.get_variables(test_ref)
    items_entry = next(item for item in variables["variables"] if item["name"] == "${items}")
    list_ref = items_entry["variablesReference"]
    toolbox.set_variable(list_ref, "1", "'plum'")

    nested = toolbox.get_variables(list_ref)
    assert [item["value"] for item in nested["variables"]] == ["'apple'", "'plum'"]

    stepped_in = toolbox.control("stepIn")
    assert stepped_in["topFrame"]["name"] == "Nested keyword"
    stepped_out = toolbox.control("stepOut")
    assert stepped_out["topFrame"]["name"] == "Verify totals"
    stepped_next = toolbox.control("next")
    assert stepped_next["topFrame"]["line"] == 29

    eval_result = toolbox.evaluate("$retry_count + 4")
    assert eval_result["rawResult"] == 5
