from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, BinaryIO

from .demo import build_demo_toolbox
from .models import AgentMode, PolicyConfig, SessionState
from .policy import AgentDebugError


@dataclass
class DapApplication:
    toolbox: Any = field(default_factory=build_demo_toolbox)

    def launch(self, arguments: dict[str, Any]) -> dict[str, Any]:
        mode_name = arguments.get("mode", AgentMode.FULL_CONTROL.value)
        source = arguments.get("program") or arguments.get("source") or "demo.robot"
        title = arguments.get("name") or Path(source).stem or "robotframework-aidebug"
        try:
            mode = AgentMode(mode_name)
        except ValueError:
            mode = AgentMode.FULL_CONTROL
        policy = PolicyConfig(mode=mode)
        self.toolbox = build_demo_toolbox(mode=mode, policy=policy)
        session = self.toolbox.router.active_server().session
        session.title = title
        session.source = source
        stop_reason = arguments.get("stopReason", "entry")
        if arguments.get("stopOnEntry", True):
            session.data.state = SessionState.PAUSED
            session.data.stop_reason = stop_reason
        else:
            session.data.state = SessionState.RUNNING
            session.data.stop_reason = "launched"
        return {}

    def dispatch(self, command: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        args = arguments or {}
        if command == "initialize":
            return {
                "supportsConfigurationDoneRequest": True,
                "supportsEvaluateForHovers": True,
                "supportsSetVariable": True,
                "supportsCompletionsRequest": True,
                "supportsTerminateRequest": True,
            }
        if command in {"launch", "attach"}:
            return self.launch(args)
        if command in {"setBreakpoints", "setExceptionBreakpoints"}:
            return {"breakpoints": []}
        if command == "configurationDone":
            return {}
        if command == "disconnect":
            return {}
        if command == "terminate":
            self.toolbox.control("pause")
            session = self.toolbox.router.active_server().session
            session.data.state = SessionState.STOPPED
            session.data.stop_reason = "terminated"
            return {}
        return self.toolbox.router.active_server().dispatch(command, args)


class DapServer:
    def __init__(self, app: DapApplication | None = None, *, stdin: BinaryIO | None = None, stdout: BinaryIO | None = None) -> None:
        self.app = app or DapApplication()
        self.stdin = stdin or sys.stdin.buffer
        self.stdout = stdout or sys.stdout.buffer
        self._seq = 1

    def serve_forever(self) -> int:
        while True:
            message = self._read_message()
            if message is None:
                break
            if message.get("type") != "request":
                continue
            self._handle_request(message)
        return 0

    def _handle_request(self, message: dict[str, Any]) -> None:
        command = message["command"]
        arguments = dict(message.get("arguments") or {})
        request_seq = message["seq"]
        try:
            body = self.app.dispatch(command, arguments)
            self._send_response(request_seq, command, body)
        except AgentDebugError as exc:
            self._send_response(request_seq, command, {}, success=False, message=exc.message)
            return
        except Exception as exc:  # pragma: no cover - defensive surface
            self._send_response(request_seq, command, {}, success=False, message=str(exc))
            return

        if command == "initialize":
            self._send_event("initialized", {})
        elif command in {"launch", "attach", "configurationDone"}:
            session = self.app.toolbox.router.active_server().session
            if session.data.state == SessionState.PAUSED:
                self._send_event("stopped", {"reason": session.data.stop_reason, "threadId": session.data.thread_id})
        elif command == "continue":
            session = self.app.toolbox.router.active_server().session
            self._send_event("continued", {"threadId": session.data.thread_id, "allThreadsContinued": True})
        elif command in {"pause", "next", "stepIn", "stepOut"}:
            session = self.app.toolbox.router.active_server().session
            self._send_event("stopped", {"reason": session.data.stop_reason, "threadId": session.data.thread_id})
        elif command in {"disconnect", "terminate"}:
            self._send_event("terminated", {})

    def _read_message(self) -> dict[str, Any] | None:
        headers: dict[str, str] = {}
        while True:
            line = self.stdin.readline()
            if not line:
                return None
            if line in {b"\r\n", b"\n"}:
                break
            name, _, value = line.decode("utf-8").partition(":")
            headers[name.strip().lower()] = value.strip()
        content_length = int(headers.get("content-length", "0"))
        if content_length <= 0:
            return None
        payload = self.stdin.read(content_length)
        return json.loads(payload.decode("utf-8"))

    def _send(self, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        header = f"Content-Length: {len(encoded)}\r\n\r\n".encode("ascii")
        self.stdout.write(header)
        self.stdout.write(encoded)
        self.stdout.flush()

    def _send_response(
        self,
        request_seq: int,
        command: str,
        body: dict[str, Any],
        *,
        success: bool = True,
        message: str | None = None,
    ) -> None:
        payload = {
            "seq": self._seq,
            "type": "response",
            "request_seq": request_seq,
            "success": success,
            "command": command,
            "body": body,
        }
        if message is not None:
            payload["message"] = message
        self._seq += 1
        self._send(payload)

    def _send_event(self, event: str, body: dict[str, Any]) -> None:
        payload = {"seq": self._seq, "type": "event", "event": event, "body": body}
        self._seq += 1
        self._send(payload)


def main() -> int:
    return DapServer().serve_forever()


if __name__ == "__main__":
    raise SystemExit(main())
