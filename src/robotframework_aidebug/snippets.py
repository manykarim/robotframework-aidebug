from __future__ import annotations

from functools import lru_cache
from typing import Any

from robot.api.parsing import get_model
from robot.running import TestSuite

from .policy import AgentDebugError


def wrap_snippet(snippet: str, suite_name: str = "Agent Snippet", test_name: str = "Agent Probe") -> str:
    indented = "\n".join(f"    {line}" if line else "" for line in snippet.splitlines())
    return f"*** Test Cases ***\n{test_name}\n{indented}\n"


@lru_cache(maxsize=128)
def parse_snippet(snippet: str) -> tuple[Any, ...]:
    model = get_model(wrap_snippet(snippet))
    if model.errors:
        first_error = model.errors[0]
        raise AgentDebugError("snippet_parse_error", str(first_error))
    suite = TestSuite.from_model(model)
    if not suite.tests:
        raise AgentDebugError("snippet_parse_error", "Snippet envelope did not produce a test body.")
    return tuple(suite.tests[0].body)


def clear_snippet_cache() -> None:
    parse_snippet.cache_clear()
