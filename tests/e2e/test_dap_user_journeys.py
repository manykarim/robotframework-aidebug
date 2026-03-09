from __future__ import annotations

import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]


@dataclass
class DapClient:
    process: subprocess.Popen[bytes]
    seq: int = 1

    def close(self) -> None:
        self.process.stdin.close()
        self.process.terminate()
        self.process.wait(timeout=5)

    def request(self, command: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = {
            "seq": self.seq,
            "type": "request",
            "command": command,
            "arguments": arguments or {},
        }
        self.seq += 1
        body = json.dumps(payload).encode("utf-8")
        header = f"Content-Length: {len(body)}\r\n\r\n".encode("ascii")
        assert self.process.stdin is not None
        self.process.stdin.write(header + body)
        self.process.stdin.flush()
        while True:
            message = self._read_message()
            if message["type"] == "event":
                continue
            return message

    def _read_message(self) -> dict[str, Any]:
        assert self.process.stdout is not None
        headers = {}
        while True:
            line = self.process.stdout.readline()
            if not line:
                raise RuntimeError("DAP server closed stdout")
            if line in {b"\r\n", b"\n"}:
                break
            name, _, value = line.decode("utf-8").partition(":")
            headers[name.strip().lower()] = value.strip()
        length = int(headers["content-length"])
        body = self.process.stdout.read(length)
        return json.loads(body.decode("utf-8"))


def start_client() -> DapClient:
    process = subprocess.Popen(
        [sys.executable, "-m", "robotframework_aidebug.dap_server"],
        cwd=ROOT,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    client = DapClient(process)
    init = client.request("initialize")
    assert init["success"] is True
    launch = client.request("launch", {"program": "tests/checkout.robot", "mode": "fullControl", "stopOnEntry": True})
    assert launch["success"] is True
    return client


def test_dap_full_control_journey() -> None:
    client = start_client()
    try:
        threads = client.request("threads")
        thread_id = threads["body"]["threads"][0]["id"]
        stack = client.request("stackTrace", {"threadId": thread_id})
        frame_id = stack["body"]["stackFrames"][0]["id"]
        scopes = client.request("scopes", {"frameId": frame_id})
        local_ref = scopes["body"]["scopes"][0]["variablesReference"]

        state = client.request("robot/getExecutionState", {"includeStack": True, "includeScopes": True})
        assert state["body"]["state"] == "paused"

        variables = client.request("robot/getVariablesSnapshot", {"scopes": ["local", "suite", "global"], "max_items": 20})
        assert variables["body"]["variables"]["suite"]["${password}"] == "<redacted>"

        mutation = client.request("setVariable", {"variablesReference": local_ref, "name": "${status}", "value": "'RECOVERED'"})
        assert mutation["body"]["value"] == "'RECOVERED'"

        keyword = client.request("robot/executeKeyword", {"keyword": "Set Suite Variable", "args": ["${recovery_flag}", "ready"], "assign": []})
        assert keyword["body"]["status"] == "PASS"

        snippet = client.request(
            "robot/executeSnippet",
            {
                "snippet": "FOR    ${fruit}    IN    kiwi    mango\n    Append To List    ${items}    ${fruit}\nEND\nLog    via dap"
            },
        )
        assert snippet["body"]["status"] == "OK"

        completions = client.request("completions", {"text": "log"})
        labels = {item["label"] for item in completions["body"]["targets"]}
        assert "Log" in labels

        audit = client.request("robot/getAuditLog", {"limit": 10})
        commands = {entry["command"] for entry in audit["body"]["entries"]}
        assert "robot/executeSnippet" in commands
    finally:
        client.close()
