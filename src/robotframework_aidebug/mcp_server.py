from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from typing import Any

from fastmcp import FastMCP
from fastmcp.server.auth.auth import AccessToken, AuthProvider
from mcp.types import ToolAnnotations

from .agent_protocol import bounded_envelope, canonical_error, make_envelope
from .demo import build_demo_toolbox
from .models import AgentMode, PolicyConfig
from .policy import AgentDebugError


INSTRUCTIONS = """You are connected to robotframework-aidebug.
Inspect before mutating.
Prefer get_state, get_variables_snapshot, and get_runtime_context before execute_keyword, execute_snippet, or set_variable.
Prefer execute_page_script over free-form Browser JavaScript snippets when page-scoped JavaScript is needed.
Mutating tools may be denied by control mode or paused-session requirements.
Keep requests narrow and prefer bounded follow-up calls over large dumps.
"""


class StaticTokenAuthProvider(AuthProvider):
    def __init__(self, token: str, base_url: str | None = None) -> None:
        super().__init__(base_url=base_url)
        self._token = token

    async def verify_token(self, token: str) -> AccessToken | None:
        if token != self._token:
            return None
        return AccessToken(token=token, client_id="robotframework-aidebug", scopes=[])


@dataclass
class McpApplication:
    mode: AgentMode = AgentMode.FULL_CONTROL

    def __post_init__(self) -> None:
        self.toolbox = build_demo_toolbox(mode=self.mode, policy=PolicyConfig(mode=self.mode))

    def _scope_reference(self, scope: str) -> int:
        state = self.toolbox.get_state(includeStack=True, includeScopes=True)
        scopes = state.get("scopes") or []
        target_name = scope.strip().lower()
        for item in scopes:
            if item["name"].lower() == target_name:
                return item["variablesReference"]
        raise AgentDebugError("invalid_arguments", f"Unknown scope: {scope}")

    def _invoke(self, tool: str, func) -> dict[str, Any]:
        started = time.perf_counter()
        try:
            payload = func()
            envelope = bounded_envelope(tool, payload)
        except Exception as error:  # noqa: BLE001 - convert to canonical envelope
            code, status, retryable = canonical_error(error)
            envelope = make_envelope(
                tool=tool,
                status=status,
                error_code=code,
                error_message=str(error),
                retryable=retryable,
                duration_ms=(time.perf_counter() - started) * 1000.0,
            )
        else:
            envelope["duration_ms"] = round((time.perf_counter() - started) * 1000.0, 3)
        return envelope

    def get_state(self, include_stack: bool = True, include_scopes: bool = False, max_log_lines: int = 20) -> dict[str, Any]:
        return self._invoke(
            "get_state",
            lambda: self.toolbox.get_state(
                includeStack=include_stack,
                includeScopes=include_scopes,
                maxLogLines=max_log_lines,
            ),
        )

    def get_variables_snapshot(
        self,
        scopes: list[str] | None = None,
        max_items: int = 20,
        start: int = 0,
        names: list[str] | None = None,
        include_values: bool = True,
    ) -> dict[str, Any]:
        def run() -> dict[str, Any]:
            payload = self.toolbox.get_variables_snapshot(
                scopes=scopes or ["local", "test", "suite", "global"],
                max_items=max_items,
                start=start,
                names=names or [],
            )
            if include_values:
                return payload
            return {
                "variables": {
                    scope: sorted(values.keys())
                    for scope, values in payload["variables"].items()
                },
                "truncated": payload["truncated"],
            }

        return self._invoke("get_variables_snapshot", run)

    def get_runtime_context(
        self,
        text: str = "",
        include_completions: bool = True,
        include_namespace_summary: bool = True,
        max_items: int = 25,
    ) -> dict[str, Any]:
        return self._invoke(
            "get_runtime_context",
            lambda: self.toolbox.get_runtime_context(
                text=text,
                includeCompletions=include_completions,
                includeNamespaceSummary=include_namespace_summary,
                maxItems=max_items,
            ),
        )

    def get_capabilities(self) -> dict[str, Any]:
        return self._invoke("get_capabilities", self.toolbox.probe_capabilities)

    def get_audit_log(self, limit: int = 20) -> dict[str, Any]:
        return self._invoke("get_audit_log", lambda: self.toolbox.get_audit_log(limit))

    def control_execution(self, action: str) -> dict[str, Any]:
        return self._invoke("control_execution", lambda: self.toolbox.control(action))

    def execute_keyword(self, keyword: str, args: list[str] | None = None, assign: list[str] | None = None) -> dict[str, Any]:
        return self._invoke("execute_keyword", lambda: self.toolbox.execute_keyword(keyword, args or [], assign or []))

    def execute_page_script(
        self,
        script: str,
        selector: str = "body",
        assign: list[str] | None = None,
    ) -> dict[str, Any]:
        return self._invoke("execute_page_script", lambda: self.toolbox.execute_page_script(script, selector, assign or []))

    def execute_snippet(self, snippet: str, purpose: str | None = None) -> dict[str, Any]:
        return self._invoke("execute_snippet", lambda: self.toolbox.execute_snippet(snippet))

    def set_variable(self, name: str, value: str, scope: str = "local") -> dict[str, Any]:
        return self._invoke(
            "set_variable",
            lambda: self.toolbox.set_variable(self._scope_reference(scope), name, value),
        )



def build_mcp_server(app: McpApplication, auth_token: str | None = None, base_url: str | None = None) -> FastMCP:
    auth = StaticTokenAuthProvider(auth_token, base_url=base_url) if auth_token else None
    server = FastMCP(
        name="robotframework-aidebug",
        version="0.1.0",
        instructions=INSTRUCTIONS,
        auth=auth,
    )

    readonly = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True)
    mutating = ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=False)

    server.tool(app.get_state, name="get_state", annotations=readonly, description="Inspect the current Robot Framework debug state.")
    server.tool(app.get_variables_snapshot, name="get_variables_snapshot", annotations=readonly, description="Inspect a bounded snapshot of visible variables.")
    server.tool(app.get_runtime_context, name="get_runtime_context", annotations=readonly, description="Inspect bounded runtime context, including completions and namespace summary.")
    server.tool(app.get_capabilities, name="get_capabilities", annotations=readonly, description="Inspect current runtime and policy capabilities.")
    server.tool(app.get_audit_log, name="get_audit_log", annotations=readonly, description="Inspect recent audit entries.")
    server.tool(app.control_execution, name="control_execution", annotations=mutating, description="Control debugger execution state.")
    server.tool(app.execute_keyword, name="execute_keyword", annotations=mutating, description="Execute one Robot Framework keyword in the paused runtime.")
    server.tool(app.execute_page_script, name="execute_page_script", annotations=mutating, description="Execute page-scoped JavaScript through a structured helper that avoids Robot interpolation conflicts.")
    server.tool(app.execute_snippet, name="execute_snippet", annotations=mutating, description="Execute a bounded multi-line Robot Framework snippet in the paused runtime.")
    server.tool(app.set_variable, name="set_variable", annotations=mutating, description="Set a Robot Framework variable in the chosen scope.")

    @server.prompt(name="inspect_paused_state", description="Inspect the current paused Robot Framework state before taking action.")
    def inspect_paused_state_prompt() -> str:
        return (
            "Inspect the current Robot Framework debug session in three steps: "
            "get_state, get_variables_snapshot, then get_runtime_context. "
            "Prefer narrow, bounded calls."
        )

    @server.prompt(name="recover_failed_keyword", description="Guide the agent through a safe failure diagnosis flow.")
    def recover_failed_keyword_prompt() -> str:
        return (
            "Diagnose the current paused failure first. "
            "Inspect state and local/test variables before executing mutating tools. "
            "If you need to mutate state, explain why and keep the change minimal."
        )

    @server.resource("aidebug://capabilities", name="capabilities", description="Current capability snapshot.", mime_type="application/json")
    def capabilities_resource() -> str:
        return json.dumps(app.get_capabilities(), indent=2)

    @server.resource("aidebug://audit/recent", name="recent-audit", description="Recent audit entries.", mime_type="application/json")
    def audit_resource() -> str:
        return json.dumps(app.get_audit_log(limit=20), indent=2)

    return server



def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="robotframework-aidebug-mcp")
    parser.add_argument("--transport", choices=["stdio", "streamable-http"], default="stdio")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--path", default="/mcp")
    parser.add_argument("--mode", choices=[mode.value for mode in AgentMode], default=AgentMode.FULL_CONTROL.value)
    parser.add_argument("--auth-token", default=None)
    parser.add_argument("--no-banner", action="store_true")
    return parser



def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    mode = AgentMode(args.mode)
    app = McpApplication(mode=mode)
    base_url = f"http://{args.host}:{args.port}" if args.transport != "stdio" else None
    server = build_mcp_server(app, auth_token=args.auth_token, base_url=base_url)
    if args.transport == "stdio":
        server.run(transport="stdio", show_banner=not args.no_banner)
        return 0
    if not args.auth_token:
        parser.error("--auth-token is required for streamable-http transport")
    server.run(
        transport="streamable-http",
        host=args.host,
        port=args.port,
        path=args.path,
        show_banner=not args.no_banner,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
