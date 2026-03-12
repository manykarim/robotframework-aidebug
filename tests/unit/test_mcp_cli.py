from __future__ import annotations

import anyio
import pytest

from robotframework_aidebug.mcp_server import StaticTokenAuthProvider, build_parser, main


async def _verify_token() -> None:
    provider = StaticTokenAuthProvider("secret", base_url="http://127.0.0.1:8765")
    assert await provider.verify_token("secret") is not None
    assert await provider.verify_token("wrong") is None



def test_mcp_parser_defaults() -> None:
    args = build_parser().parse_args([])
    assert args.transport == "stdio"
    assert args.host == "127.0.0.1"
    assert args.path == "/mcp"



def test_mcp_http_requires_auth_token() -> None:
    with pytest.raises(SystemExit):
        main(["--transport", "streamable-http", "--no-banner"])



def test_static_token_auth_provider() -> None:
    anyio.run(_verify_token)
