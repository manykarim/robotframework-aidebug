from __future__ import annotations

import io
import json

from robotframework_aidebug.dap_server import DapServer


def _encode(message: dict) -> bytes:
    body = json.dumps(message).encode("utf-8")
    return f"Content-Length: {len(body)}\r\n\r\n".encode("ascii") + body


def _decode(stream: bytes) -> list[dict]:
    messages = []
    view = memoryview(stream)
    index = 0
    while index < len(view):
        header_end = stream.find(b"\r\n\r\n", index)
        if header_end == -1:
            break
        header = stream[index:header_end].decode("ascii")
        length = int(header.split(":", 1)[1].strip())
        start = header_end + 4
        body = bytes(view[start : start + length])
        messages.append(json.loads(body.decode("utf-8")))
        index = start + length
    return messages


def test_dap_server_handles_initialize_and_launch() -> None:
    stdin = io.BytesIO(
        _encode({"seq": 1, "type": "request", "command": "initialize", "arguments": {}})
        + _encode(
            {
                "seq": 2,
                "type": "request",
                "command": "launch",
                "arguments": {"program": "demo.robot", "mode": "fullControl", "stopOnEntry": True},
            }
        )
    )
    stdout = io.BytesIO()
    server = DapServer(stdin=stdin, stdout=stdout)
    rc = server.serve_forever()
    assert rc == 0
    messages = _decode(stdout.getvalue())
    assert any(msg.get("type") == "response" and msg.get("command") == "initialize" for msg in messages)
    assert any(msg.get("type") == "event" and msg.get("event") == "initialized" for msg in messages)
    assert any(msg.get("type") == "response" and msg.get("command") == "launch" for msg in messages)
    assert any(msg.get("type") == "event" and msg.get("event") == "stopped" for msg in messages)


def test_dap_server_exposes_threads_and_stack() -> None:
    stdin = io.BytesIO(
        _encode({"seq": 1, "type": "request", "command": "initialize", "arguments": {}})
        + _encode({"seq": 2, "type": "request", "command": "launch", "arguments": {}})
        + _encode({"seq": 3, "type": "request", "command": "threads", "arguments": {}})
        + _encode({"seq": 4, "type": "request", "command": "stackTrace", "arguments": {"threadId": 1}})
    )
    stdout = io.BytesIO()
    server = DapServer(stdin=stdin, stdout=stdout)
    server.serve_forever()
    responses = [msg for msg in _decode(stdout.getvalue()) if msg.get("type") == "response"]
    threads = next(msg for msg in responses if msg["command"] == "threads")
    stack = next(msg for msg in responses if msg["command"] == "stackTrace")
    assert threads["body"]["threads"][0]["name"] == "RobotMain"
    assert stack["body"]["stackFrames"][0]["name"] == "Verify totals"
