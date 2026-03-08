from __future__ import annotations

import io
import json

from robotframework_aidebug.stdio_server import BackendApplication, StdioServer


def test_stdio_server_handles_health_and_exit() -> None:
    stdin = io.StringIO('{"id":1,"command":"health"}\n__EXIT__\n')
    stdout = io.StringIO()
    server = StdioServer(BackendApplication(), stdin=stdin, stdout=stdout)
    rc = server.serve_forever()
    assert rc == 0
    response = json.loads(stdout.getvalue().strip())
    assert response["ok"] is True
    assert response["result"]["status"] == "ok"


def test_stdio_server_returns_structured_errors() -> None:
    stdin = io.StringIO('{"id":2,"command":"robot/unknown"}\n__EXIT__\n')
    stdout = io.StringIO()
    server = StdioServer(BackendApplication(), stdin=stdin, stdout=stdout)
    server.serve_forever()
    response = json.loads(stdout.getvalue().strip())
    assert response["ok"] is False
    assert response["error"]["code"] == "unknown_command"
