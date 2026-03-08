from __future__ import annotations

import time
from typing import Any

from .policy import AgentDebugError
from .session import AgentDebugSession


class DebugServer:
    def __init__(self, session: AgentDebugSession) -> None:
        self.session = session

    def dispatch(self, command: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        args = arguments or {}
        started_at = time.time()
        try:
            response = self._dispatch(command, args)
        except AgentDebugError as exc:
            self.session.audit(command, args, f"ERROR:{exc.code}", started_at)
            raise
        self.session.audit(command, args, "OK", started_at)
        return response

    def _dispatch(self, command: str, args: dict[str, Any]) -> dict[str, Any]:
        match command:
            case "stackTrace":
                return self.session.stack_trace(**args)
            case "scopes":
                return {"scopes": self.session.scopes(**args)}
            case "variables":
                return self.session.variables(**args)
            case "evaluate":
                return self.session.evaluate(**args)
            case "setVariable":
                return self.session.set_variable(**args)
            case "continue" | "pause" | "next" | "stepIn" | "stepOut":
                return self.session.control_execution(command)
            case "robot/getExecutionState":
                return self.session.get_execution_state(**args)
            case "robot/getVariablesSnapshot":
                return self.session.get_variables_snapshot(**args)
            case "robot/executeKeyword":
                return self.session.execute_keyword(**args)
            case "robot/executeSnippet":
                return self.session.execute_snippet(**args)
            case _:
                raise AgentDebugError("unknown_command", f"Unknown command: {command}")
