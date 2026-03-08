from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from typing import Any, TextIO

from .demo import build_demo_toolbox
from .policy import AgentDebugError


@dataclass
class BackendApplication:
    toolbox: Any = field(default_factory=build_demo_toolbox)

    def reset_demo(self) -> dict[str, Any]:
        self.toolbox = build_demo_toolbox()
        return {"status": "reset"}

    def handle(self, command: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        args = arguments or {}
        if command == "health":
            return {"status": "ok", "backend": "robotframework-aidebug"}
        if command == "resetDemo":
            return self.reset_demo()
        if command == "robot/getExecutionState":
            return self.toolbox.get_state(**args)
        if command == "stackTrace":
            return self.toolbox.get_stack()
        if command == "scopes":
            return self.toolbox.get_scopes(args["frameId"])
        if command == "variables":
            variables_reference = args.pop("variablesReference")
            return self.toolbox.get_variables(variables_reference, **args)
        if command == "robot/getVariablesSnapshot":
            return self.toolbox.get_variables_snapshot(**args)
        if command == "evaluate":
            return self.toolbox.evaluate(args["expression"])
        if command == "setVariable":
            return self.toolbox.set_variable(args["variablesReference"], args["name"], args["value"])
        if command == "robot/executeKeyword":
            return self.toolbox.execute_keyword(args["keyword"], args.get("args"), args.get("assign"))
        if command == "robot/executeSnippet":
            return self.toolbox.execute_snippet(args["snippet"])
        if command in {"continue", "pause", "next", "stepIn", "stepOut"}:
            return self.toolbox.control(command)
        raise AgentDebugError("unknown_command", f"Unknown command: {command}")


class StdioServer:
    def __init__(self, app: BackendApplication | None = None, *, stdin: TextIO | None = None, stdout: TextIO | None = None) -> None:
        self.app = app or BackendApplication()
        self.stdin = stdin or sys.stdin
        self.stdout = stdout or sys.stdout

    def serve_forever(self) -> int:
        for line in self.stdin:
            raw = line.strip()
            if not raw:
                continue
            if raw == "__EXIT__":
                break
            response = self._handle_line(raw)
            self.stdout.write(json.dumps(response) + "\n")
            self.stdout.flush()
        return 0

    def _handle_line(self, raw: str) -> dict[str, Any]:
        try:
            request = json.loads(raw)
            request_id = request.get("id")
            command = request["command"]
            arguments = request.get("arguments", {})
            result = self.app.handle(command, arguments)
            return {"id": request_id, "ok": True, "result": result}
        except AgentDebugError as exc:
            return {
                "id": request.get("id") if "request" in locals() else None,
                "ok": False,
                "error": {"code": exc.code, "message": exc.message},
            }
        except Exception as exc:  # pragma: no cover - defensive surface
            return {
                "id": request.get("id") if "request" in locals() else None,
                "ok": False,
                "error": {"code": "internal_error", "message": str(exc)},
            }


def main() -> int:
    server = StdioServer()
    return server.serve_forever()


if __name__ == "__main__":
    raise SystemExit(main())
