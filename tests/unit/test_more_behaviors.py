from __future__ import annotations

import pytest

from robotframework_aidebug import AgentDebugError
from robotframework_aidebug.demo import build_demo_toolbox
from robotframework_aidebug.models import PolicyConfig
from robotframework_aidebug.server import DebugServer
from robotframework_aidebug.session import AgentDebugSession

def test_unknown_command_is_rejected(toolbox) -> None:
    with pytest.raises(AgentDebugError, match="Unknown command"):
        toolbox.router.active_server().dispatch("robot/unknown")


def test_execute_snippet_rejects_unsupported_nodes(toolbox) -> None:
    with pytest.raises(AgentDebugError, match="Unsupported snippet node"):
        toolbox.execute_snippet("WHILE    True\n    Log    nope\nEND")


def test_keyword_fail_and_get_variable_value(toolbox) -> None:
    with pytest.raises(AgentDebugError, match="boom"):
        toolbox.execute_keyword("Fail", ["boom"])
    result = toolbox.execute_keyword("Get Variable Value", ["${status}"])
    assert result["returnValueRepr"] == "'FAILED'"


def test_rate_limiter_blocks_excessive_writes() -> None:
    toolbox = build_demo_toolbox(policy=PolicyConfig(max_write_actions_per_minute=1))
    state = toolbox.get_state()
    local_ref = toolbox.get_scopes(state["topFrame"]["id"])["scopes"][0]["variablesReference"]
    toolbox.set_variable(local_ref, "${status}", "'RECOVERED'")
    with pytest.raises(AgentDebugError, match="rate limit"):
        toolbox.set_variable(local_ref, "${status}", "'FAILED'")


def test_server_can_be_used_without_toolbox() -> None:
    session = AgentDebugSession("direct", "tests/direct.robot")
    session.add_demo_data()
    server = DebugServer(session)
    state = server.dispatch("robot/getExecutionState", {"includeStack": True})
    assert state["topFrame"]["source"] == "demo.robot"
