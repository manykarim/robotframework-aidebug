from __future__ import annotations

import argparse
import json

from .benchmark import run_benchmarks
from .dap_server import main as dap_main
from .demo import build_demo_toolbox
from .mcp_server import main as mcp_main
from .stdio_server import main as stdio_main


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="robotframework-aidebug")
    subparsers = parser.add_subparsers(dest="command", required=False)

    subparsers.add_parser("demo", help="Print a demo interaction payload.")
    bench = subparsers.add_parser("benchmark", help="Run local benchmarks.")
    bench.add_argument("--iterations", type=int, default=500)
    subparsers.add_parser("stdio-server", help="Run the stdio JSON backend server.")
    subparsers.add_parser("dap-server", help="Run the DAP stdio debug adapter.")
    subparsers.add_parser("mcp-server", help="Run the MCP server.")
    return parser


def run_demo() -> int:
    toolbox = build_demo_toolbox()
    state = toolbox.get_state()
    scopes = toolbox.get_scopes(state["topFrame"]["id"])
    local_ref = scopes["scopes"][0]["variablesReference"]
    payload = {
        "state": state,
        "variables": toolbox.get_variables_snapshot(scopes=["local", "test"]),
        "setVariable": toolbox.set_variable(local_ref, "${status}", "'RECOVERED'"),
        "executeKeyword": toolbox.execute_keyword("Log", ["demo run"]),
        "executeSnippet": toolbox.execute_snippet("IF    $status == 'RECOVERED'\n    Log    healed\nEND"),
    }
    print(json.dumps(payload, indent=2))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    command = args.command or "demo"
    if command == "demo":
        return run_demo()
    if command == "benchmark":
        print(json.dumps(run_benchmarks(iterations=args.iterations), indent=2))
        return 0
    if command == "stdio-server":
        return stdio_main()
    if command == "dap-server":
        return dap_main()
    if command == "mcp-server":
        return mcp_main([])
    parser.error(f"Unknown command: {command}")
    return 2
