from __future__ import annotations

import time
from typing import Any

from .policy import AgentDebugError
from .session import AgentDebugSession


class DebugServer:
    def __init__(self, session: AgentDebugSession) -> None:
        self.session = session

    def dispatch(self, command: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        args = dict(arguments or {})
        correlation_id = args.get("_correlationId")
        args.pop("_correlationId", None)
        started_at = time.time()
        try:
            response = self._dispatch(command, args)
        except AgentDebugError as exc:
            self.session.audit(command, args, f"ERROR:{exc.code}", started_at, correlation_id=correlation_id)
            raise
        self.session.audit(command, args, "OK", started_at, correlation_id=correlation_id)
        return response

    def _dispatch(self, command: str, args: dict[str, Any]) -> dict[str, Any]:
        match command:
            case "threads":
                return self.session.threads()
            case "stackTrace":
                return self.session.stack_trace(**args)
            case "scopes":
                return {"scopes": self.session.scopes(**args)}
            case "variables":
                return self.session.variables(**args)
            case "evaluate":
                return self.session.evaluate(**args)
            case "completions":
                return self.session.runtime_completions(**args)
            case "setVariable":
                return self.session.set_variable(**args)
            case "continue" | "pause" | "next" | "stepIn" | "stepOut":
                return self.session.control_execution(command)
            case "robot/probeCapabilities":
                return self.session.probe_capabilities()
            case "robot/getExecutionState":
                return self.session.get_execution_state(**args)
            case "robot/getVariablesSnapshot":
                return self.session.get_variables_snapshot(**args)
            case "robot/getRuntimeContext":
                return self.session.get_runtime_context(**args)
            case "robot/getAuditLog":
                return self.session.get_audit_log(**args)
            case "robot/executeKeyword":
                return self.session.execute_keyword(**args)
            case "robot/executePageScript":
                return self.session.execute_page_script(**args)
            case "robot/executeSnippet":
                return self.session.execute_snippet(**args)
            case "robot/sync":
                return {"ok": True}
            case _:
                raise AgentDebugError("unknown_command", f"Unknown command: {command}")
