from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .policy import AgentDebugError
from .server import DebugServer


@dataclass
class SessionRouter:
    server: DebugServer | None = None

    def active_server(self) -> DebugServer:
        if self.server is None:
            raise AgentDebugError("no_session", "No active RobotCode debug session is available.")
        return self.server


class AgentToolbox:
    def __init__(self, router: SessionRouter) -> None:
        self.router = router

    def get_state(self, **arguments: Any) -> dict[str, Any]:
        return self.router.active_server().dispatch("robot/getExecutionState", arguments)

    def get_stack(self) -> dict[str, Any]:
        return self.router.active_server().dispatch("stackTrace", {"threadId": 1})

    def get_threads(self) -> dict[str, Any]:
        return self.router.active_server().dispatch("threads", {})

    def get_scopes(self, frame_id: int) -> dict[str, Any]:
        return self.router.active_server().dispatch("scopes", {"frameId": frame_id})

    def get_variables(self, variables_reference: int, **arguments: Any) -> dict[str, Any]:
        payload = {"variablesReference": variables_reference, **arguments}
        return self.router.active_server().dispatch("variables", payload)

    def get_variables_snapshot(self, **arguments: Any) -> dict[str, Any]:
        return self.router.active_server().dispatch("robot/getVariablesSnapshot", arguments)

    def probe_capabilities(self) -> dict[str, Any]:
        return self.router.active_server().dispatch("robot/probeCapabilities", {})

    def get_audit_log(self, limit: int = 20) -> dict[str, Any]:
        return self.router.active_server().dispatch("robot/getAuditLog", {"limit": limit})

    def evaluate(self, expression: str) -> dict[str, Any]:
        return self.router.active_server().dispatch("evaluate", {"expression": expression})

    def get_runtime_completions(self, text: str = "") -> dict[str, Any]:
        return self.router.active_server().dispatch("completions", {"text": text})

    def set_variable(self, variables_reference: int, name: str, value: str) -> dict[str, Any]:
        return self.router.active_server().dispatch(
            "setVariable",
            {"variablesReference": variables_reference, "name": name, "value": value},
        )

    def execute_keyword(self, keyword: str, args: list[str] | None = None, assign: list[str] | None = None) -> dict[str, Any]:
        return self.router.active_server().dispatch(
            "robot/executeKeyword",
            {"keyword": keyword, "args": args or [], "assign": assign or [], "captureLog": True},
        )

    def execute_snippet(self, snippet: str) -> dict[str, Any]:
        return self.router.active_server().dispatch("robot/executeSnippet", {"snippet": snippet})

    def control(self, command: str) -> dict[str, Any]:
        return self.router.active_server().dispatch(command, {})
