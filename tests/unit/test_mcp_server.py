from __future__ import annotations

import socket
import subprocess
import sys
import time
from pathlib import Path

import anyio
import httpx
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.streamable_http import streamable_http_client

REPO_ROOT = Path(__file__).resolve().parents[2]


async def _stdio_roundtrip() -> None:
    params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "robotframework_aidebug.mcp_server", "--transport", "stdio", "--no-banner"],
        cwd=REPO_ROOT,
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            names = {tool.name for tool in tools.tools}
            assert "get_state" in names
            assert "execute_keyword" in names
            assert "execute_page_script" in names
            get_state_tool = next(tool for tool in tools.tools if tool.name == "get_state")
            assert get_state_tool.annotations.readOnlyHint is True
            execute_keyword_tool = next(tool for tool in tools.tools if tool.name == "execute_keyword")
            assert execute_keyword_tool.annotations.destructiveHint is True

            result = await session.call_tool("get_state", {})
            assert result.isError is False
            assert result.structuredContent["status"] == "success"
            assert result.structuredContent["payload"]["state"] == "paused"

            filtered = await session.call_tool("get_variables_snapshot", {"scopes": ["suite"], "names": ["${base_url}"], "max_items": 10})
            assert filtered.isError is False
            assert filtered.structuredContent["payload"]["variables"]["suite"] == {"${base_url}": "'https://example.test'"}

            page_script = await session.call_tool("execute_page_script", {"selector": "body", "script": "return `${CSS.escape(el.id)}`;"})
            assert page_script.isError is False
            assert page_script.structuredContent["payload"]["status"] == "PASS"

            prompt = await session.get_prompt("inspect_paused_state")
            assert "Inspect" in prompt.messages[0].content.text

            resource = await session.read_resource("aidebug://capabilities")
            assert "get_capabilities" in resource.contents[0].text


async def _http_roundtrip(port: int) -> None:
    url = f"http://127.0.0.1:{port}/mcp"
    async with httpx.AsyncClient(headers={"Authorization": "Bearer secret-token"}) as client:
        async with streamable_http_client(url, http_client=client) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool("set_variable", {"name": "${status}", "value": "'RECOVERED'", "scope": "local"})
                assert result.isError is False
                assert result.structuredContent["status"] == "success"
                follow_up = await session.call_tool("get_variables_snapshot", {"scopes": ["local"], "max_items": 10})
                assert "${status}" in follow_up.structuredContent["payload"]["variables"]["local"]



def _wait_for_port(port: int, timeout: float = 10.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.2)
            if sock.connect_ex(("127.0.0.1", port)) == 0:
                return
        time.sleep(0.1)
    raise AssertionError(f"Timed out waiting for port {port}")



def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]



def test_mcp_stdio_server_supports_tools_prompts_and_resources() -> None:
    anyio.run(_stdio_roundtrip)



def test_mcp_http_server_requires_auth_and_serves_tools() -> None:
    port = _free_port()
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "robotframework_aidebug.mcp_server",
            "--transport",
            "streamable-http",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--path",
            "/mcp",
            "--auth-token",
            "secret-token",
            "--no-banner",
        ],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        _wait_for_port(port)
        unauthorized = httpx.post(f"http://127.0.0.1:{port}/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}})
        assert unauthorized.status_code == 401
        anyio.run(_http_roundtrip, port)
    finally:
        process.terminate()
        process.wait(timeout=10)
