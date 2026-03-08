from __future__ import annotations

from collections.abc import Callable
from typing import Any

from .policy import AgentDebugError

KeywordHandler = Callable[[Any, tuple[str, ...], tuple[Any, ...]], Any]


class KeywordRegistry:
    def __init__(self) -> None:
        self._handlers: dict[str, KeywordHandler] = {
            self._normalize("Log"): self._log,
            self._normalize("Log Variables"): self._log_variables,
            self._normalize("No Operation"): self._no_operation,
            self._normalize("Set Variable"): self._set_variable,
            self._normalize("Get Variable Value"): self._get_variable_value,
            self._normalize("Set Test Variable"): self._set_test_variable,
            self._normalize("Set Suite Variable"): self._set_suite_variable,
            self._normalize("Set Global Variable"): self._set_global_variable,
            self._normalize("Set Local Variable"): self._set_local_variable,
            self._normalize("Should Be Equal"): self._should_be_equal,
            self._normalize("Create List"): self._create_list,
            self._normalize("Append To List"): self._append_to_list,
            self._normalize("Catenate"): self._catenate,
            self._normalize("Fail"): self._fail,
            self._normalize("Evaluate"): self._evaluate,
        }

    def execute(self, session: Any, keyword: str, raw_args: tuple[str, ...]) -> Any:
        handler = self._handlers.get(self._normalize(keyword))
        if handler is None:
            raise AgentDebugError("unknown_keyword", f"Unknown keyword: {keyword}")
        resolved = tuple(session.resolve_argument(arg) for arg in raw_args)
        return handler(session, raw_args, resolved)

    @staticmethod
    def _normalize(name: str) -> str:
        return " ".join(name.lower().split())

    @staticmethod
    def _no_operation(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> None:
        session.record_event("robotMessage", {"message": "No operation executed."})
        return None

    @staticmethod
    def _log(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> None:
        message = " ".join(str(item) for item in resolved)
        session.record_event("robotLog", {"message": message})
        return None

    @staticmethod
    def _log_variables(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> dict[str, dict[str, str]]:
        snapshot = session.get_variables_snapshot(scopes=("local", "test", "suite", "global"), max_items=200)
        session.record_event("robotLog", {"message": f"Variables: {snapshot['variables']}"})
        return snapshot

    @staticmethod
    def _set_variable(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> Any:
        if not resolved:
            return None
        if len(resolved) == 1:
            return resolved[0]
        return list(resolved)

    @staticmethod
    def _get_variable_value(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> Any:
        if not raw_args:
            raise AgentDebugError("invalid_arguments", "Get Variable Value requires a variable name.")
        default = resolved[1] if len(resolved) > 1 else None
        return session.get_variable_value(raw_args[0], default)

    @staticmethod
    def _set_test_variable(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> Any:
        return session.assign_scope_variable("test", raw_args, resolved)

    @staticmethod
    def _set_suite_variable(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> Any:
        return session.assign_scope_variable("suite", raw_args, resolved)

    @staticmethod
    def _set_global_variable(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> Any:
        return session.assign_scope_variable("global", raw_args, resolved)

    @staticmethod
    def _set_local_variable(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> Any:
        return session.assign_scope_variable("local", raw_args, resolved)

    @staticmethod
    def _should_be_equal(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> None:
        if len(resolved) < 2:
            raise AgentDebugError("invalid_arguments", "Should Be Equal requires two arguments.")
        if resolved[0] != resolved[1]:
            raise AgentDebugError("assertion_failed", f"{resolved[0]!r} != {resolved[1]!r}")
        return None

    @staticmethod
    def _create_list(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> list[Any]:
        return list(resolved)

    @staticmethod
    def _append_to_list(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> list[Any]:
        if len(resolved) < 2 or not isinstance(resolved[0], list):
            raise AgentDebugError("invalid_arguments", "Append To List requires a list followed by one or more items.")
        resolved[0].extend(resolved[1:])
        return resolved[0]

    @staticmethod
    def _catenate(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> str:
        return " ".join(str(item) for item in resolved)

    @staticmethod
    def _fail(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> None:
        message = str(resolved[0]) if resolved else "Failure requested."
        raise AgentDebugError("keyword_failed", message)

    @staticmethod
    def _evaluate(session: Any, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> Any:
        if not raw_args:
            raise AgentDebugError("invalid_arguments", "Evaluate requires an expression.")
        return session.evaluate(raw_args[0])
