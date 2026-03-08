from __future__ import annotations

import ast
import itertools
import time
from collections.abc import Iterable
from dataclasses import asdict
from typing import Any

from robot.variables import Variables
from robot.variables.evaluation import evaluate_expression

from .keywords import KeywordRegistry
from .models import (
    AuditEntry,
    EventRecord,
    ExecutionItem,
    PolicyConfig,
    ReferenceTarget,
    SessionData,
    SessionState,
    StackFrame,
)
from .policy import AgentDebugError, PolicyGate
from .snippets import parse_snippet


class AgentDebugSession:
    def __init__(self, title: str, source: str, policy: PolicyConfig | None = None) -> None:
        self.title = title
        self.source = source
        self.policy = PolicyGate(policy or PolicyConfig())
        self.data = SessionData()
        if not self.data.stack_frames:
            self.data.stack_frames = [
                self.data.top_frame,
                StackFrame(id=2, name="Validate checkout", source="tests/checkout.robot", line=12, column=1),
            ]
        self.keywords = KeywordRegistry()
        self._references: dict[int, ReferenceTarget] = {}
        self._object_refs: dict[int, int] = {}
        self._next_reference = itertools.count(start=1)
        self._register_scope_refs()

    def _register_scope_refs(self) -> None:
        self._scope_refs = {
            "local": self._register_reference("scope", self.data.local_variables, "local"),
            "test": self._register_reference("scope", self.data.test_variables, "test"),
            "suite": self._register_reference("scope", self.data.suite_variables, "suite"),
            "global": self._register_reference("scope", self.data.global_variables, "global"),
        }

    def _register_reference(self, kind: str, value: Any, scope: str | None = None) -> int:
        if kind in {"dict", "list"}:
            object_id = id(value)
            ref = self._object_refs.get(object_id)
            if ref is not None:
                return ref
        ref = next(self._next_reference)
        self._references[ref] = ReferenceTarget(kind=kind, value=value, scope=scope)
        if kind in {"dict", "list"}:
            self._object_refs[id(value)] = ref
        return ref

    def record_event(self, event: str, body: dict[str, Any]) -> None:
        self.data.recent_events.append(EventRecord(event=event, body=body, ts=time.time()))

    def add_demo_data(self) -> None:
        self.data.local_variables.update({"status": "FAILED", "username": "alice", "retry_count": 1})
        self.data.test_variables.update({"order_id": "A-1042", "items": ["apple", "pear"]})
        self.data.suite_variables.update({"base_url": "https://example.test", "password": "super-secret"})
        self.data.global_variables.update({"api_token": "token-123", "environment": "local"})
        self.record_event("robotStarted", {"type": "test", "name": "Validate checkout"})
        self.record_event("robotLog", {"message": "Breakpoint reached at Verify totals"})

    def audit(self, command: str, arguments: dict[str, Any], result: str, started_at: float) -> None:
        sanitized = self._sanitize(arguments)
        self.data.audit_log.append(
            AuditEntry(
                timestamp=time.time(),
                command=command,
                sanitized_arguments=sanitized,
                result=result,
                duration_ms=(time.time() - started_at) * 1000.0,
            )
        )

    def _sanitize(self, payload: Any) -> Any:
        if isinstance(payload, dict):
            return {key: self._sanitize_value(key, value) for key, value in payload.items()}
        return payload

    def _sanitize_value(self, name: str, value: Any) -> Any:
        if isinstance(value, dict):
            return {key: self._sanitize_value(key, inner) for key, inner in value.items()}
        if isinstance(value, list):
            return [self._sanitize_value(name, item) for item in value]
        return self.policy.redactor.summarize(name, value)

    def _canonical_name(self, variable_name: str) -> str:
        name = variable_name.strip()
        name = name.removeprefix("$").removeprefix("{").removeprefix("@").removeprefix("&")
        name = name.removeprefix("{")
        if name.endswith("}="):
            name = name[:-2]
        elif name.endswith("}"):
            name = name[:-1]
        if name.endswith("="):
            name = name[:-1]
        return name.strip().lower()

    def _display_name(self, canonical_name: str) -> str:
        return f"${{{canonical_name}}}"

    def _scope_mappings(self) -> tuple[tuple[str, dict[str, Any]], ...]:
        return (
            ("local", self.data.local_variables),
            ("test", self.data.test_variables),
            ("suite", self.data.suite_variables),
            ("global", self.data.global_variables),
        )

    def _build_variables(self) -> Variables:
        variables = Variables()
        for _, mapping in reversed(self._scope_mappings()):
            for name, value in mapping.items():
                variables[self._display_name(name)] = value
        return variables

    def resolve_argument(self, argument: str) -> Any:
        variables = self._build_variables()
        if argument.startswith(("${", "@{", "&{")) and argument.endswith("}"):
            try:
                return variables.replace_scalar(argument)
            except Exception:
                return argument
        replaced = variables.replace_string(argument)
        return self._coerce_literal(replaced)

    @staticmethod
    def _coerce_literal(value: Any) -> Any:
        if not isinstance(value, str):
            return value
        try:
            return ast.literal_eval(value)
        except Exception:
            return value

    def get_variable_value(self, variable_name: str, default: Any = None) -> Any:
        canonical = self._canonical_name(variable_name)
        for _, mapping in self._scope_mappings():
            if canonical in mapping:
                return mapping[canonical]
        return default

    def assign_scope_variable(self, scope: str, raw_args: tuple[str, ...], resolved: tuple[Any, ...]) -> Any:
        if len(raw_args) < 2:
            raise AgentDebugError("invalid_arguments", f"Set {scope.title()} Variable requires a variable name and value.")
        name = self._canonical_name(raw_args[0])
        value = resolved[1] if len(resolved) == 2 else list(resolved[1:])
        self._mapping_for_scope(scope)[name] = value
        return value

    def _mapping_for_scope(self, scope: str) -> dict[str, Any]:
        return {
            "local": self.data.local_variables,
            "test": self.data.test_variables,
            "suite": self.data.suite_variables,
            "global": self.data.global_variables,
        }[scope]

    def get_execution_state(
        self,
        includeStack: bool = True,
        includeScopes: bool = False,
        maxLogLines: int = 20,
    ) -> dict[str, Any]:
        self.policy.ensure_read()
        response: dict[str, Any] = {
            "state": self.data.state.value,
            "threadId": self.data.thread_id,
            "stopReason": self.data.stop_reason,
            "currentItem": asdict(self.data.current_item),
            "recentEvents": [
                {"event": event.event, "body": event.body, "ts": event.ts}
                for event in list(self.data.recent_events)[-maxLogLines:]
            ],
        }
        if includeStack:
            response["topFrame"] = asdict(self.data.stack_frames[0])
        if includeScopes:
            response["scopes"] = self.scopes(self.data.stack_frames[0].id)
        return response

    def stack_trace(self, threadId: int | None = None) -> dict[str, Any]:
        self.policy.ensure_read()
        return {
            "stackFrames": [asdict(frame) for frame in self.data.stack_frames],
            "totalFrames": len(self.data.stack_frames),
        }

    def scopes(self, frameId: int) -> list[dict[str, Any]]:
        self.policy.ensure_read()
        return [
            {"name": scope.title(), "variablesReference": ref, "expensive": False}
            for scope, ref in self._scope_refs.items()
        ]

    def variables(
        self,
        variablesReference: int,
        filter: str | None = None,
        start: int = 0,
        count: int | None = None,
    ) -> dict[str, Any]:
        self.policy.ensure_read()
        target = self._references.get(variablesReference)
        if target is None:
            raise AgentDebugError("unknown_reference", f"Unknown variables reference: {variablesReference}")
        if target.kind in {"scope", "dict"}:
            items = list(target.value.items())
        elif target.kind == "list":
            items = list(enumerate(target.value))
        else:
            items = []
        sliced = items[start : start + count if count is not None else None]
        variables = [self._variable_entry(name, value) for name, value in sliced]
        return {"variables": variables}

    def _variable_entry(self, name: Any, value: Any) -> dict[str, Any]:
        if isinstance(name, int):
            display_name = str(name)
        else:
            display_name = self._display_name(name) if name.isidentifier() else str(name)
        reference = 0
        if isinstance(value, dict):
            reference = self._register_reference("dict", value)
        elif isinstance(value, list):
            reference = self._register_reference("list", value)
        return {
            "name": display_name,
            "value": self.policy.redactor.summarize(display_name, value),
            "variablesReference": reference,
        }

    def get_variables_snapshot(
        self,
        frameId: int | None = None,
        scopes: Iterable[str] = ("local", "test", "suite", "global"),
        max_items: int | None = None,
        redactPatterns: tuple[str, ...] | None = None,
    ) -> dict[str, Any]:
        self.policy.ensure_read()
        limit = max_items or self.policy.config.max_items
        snapshot: dict[str, dict[str, str]] = {}
        truncated = False
        custom_redactor = self.policy.redactor
        if redactPatterns is not None:
            custom_redactor = type(self.policy.redactor)(tuple(redactPatterns), self.policy.config.max_value_chars)
        for scope in scopes:
            rendered: dict[str, str] = {}
            for index, (name, value) in enumerate(self._mapping_for_scope(scope).items()):
                if index >= limit:
                    truncated = True
                    break
                rendered[self._display_name(name)] = custom_redactor.summarize(name, value)
            snapshot[scope] = rendered
        return {"variables": snapshot, "truncated": truncated}

    def evaluate(self, expression: str, frameId: int | None = None) -> dict[str, Any]:
        self.policy.ensure_read()
        variables = self._build_variables()
        if "$" in expression and not expression.strip().startswith("${"):
            result = evaluate_expression(expression, variables)
        else:
            result = variables.replace_string(expression)
        return {"result": self.policy.redactor.summarize("result", result), "rawResult": result}

    def set_variable(self, variablesReference: int, name: str, value: str) -> dict[str, Any]:
        self.policy.ensure_write()
        self._ensure_paused()
        parsed_value = self._coerce_literal(value)
        target = self._references.get(variablesReference)
        if target is None:
            raise AgentDebugError("unknown_reference", f"Unknown variables reference: {variablesReference}")
        if target.kind == "scope":
            canonical = self._canonical_name(name)
            target.value[canonical] = parsed_value
            rendered_name = self._display_name(canonical)
        elif target.kind == "dict":
            target.value[name] = parsed_value
            rendered_name = str(name)
        elif target.kind == "list":
            index = int(name)
            target.value[index] = parsed_value
            rendered_name = name
        else:
            raise AgentDebugError("invalid_reference", "Cannot set variables on this reference type.")
        self.record_event("robotMessage", {"message": f"Variable {rendered_name} set."})
        return {"name": rendered_name, "value": self.policy.redactor.summarize(rendered_name, parsed_value)}

    def control_execution(self, command: str) -> dict[str, Any]:
        self.policy.ensure_read()
        if command == "continue":
            self.data.state = SessionState.RUNNING
            self.data.stop_reason = "continued"
            self.record_event("continued", {"threadId": self.data.thread_id})
        elif command == "pause":
            self.data.state = SessionState.PAUSED
            self.data.stop_reason = "pause"
            self.record_event("stopped", {"reason": "pause"})
        elif command == "next":
            self._ensure_paused(read_only_ok=True)
            self.data.stack_frames[0].line += 1
            self.data.current_item.lineno += 1
            self.record_event("stopped", {"reason": "step", "kind": "next"})
        elif command == "stepIn":
            self._ensure_paused(read_only_ok=True)
            child = StackFrame(id=max(frame.id for frame in self.data.stack_frames) + 1, name="Nested keyword", source=self.source, line=self.data.stack_frames[0].line + 1)
            self.data.stack_frames.insert(0, child)
            self.data.top_frame = child
            self.record_event("stopped", {"reason": "step", "kind": "stepIn"})
        elif command == "stepOut":
            self._ensure_paused(read_only_ok=True)
            if len(self.data.stack_frames) > 1:
                self.data.stack_frames.pop(0)
                self.data.top_frame = self.data.stack_frames[0]
            self.record_event("stopped", {"reason": "step", "kind": "stepOut"})
        else:
            raise AgentDebugError("unknown_command", f"Unknown control command: {command}")
        return self.get_execution_state(includeStack=True, includeScopes=False)

    def execute_keyword(
        self,
        keyword: str,
        args: list[str] | None = None,
        assign: list[str] | None = None,
        frameId: int | None = None,
        timeoutSec: int | None = None,
        captureLog: bool = True,
    ) -> dict[str, Any]:
        self.policy.ensure_write()
        self._ensure_paused()
        result = self.keywords.execute(self, keyword, tuple(args or []))
        assignments: dict[str, str] = {}
        if assign:
            values: list[Any]
            if isinstance(result, list):
                values = result
            else:
                values = [result]
            for target_name, value in itertools.zip_longest(assign, values, fillvalue=None):
                if target_name is None:
                    continue
                canonical = self._canonical_name(target_name)
                self.data.local_variables[canonical] = value
                assignments[self._display_name(canonical)] = self.policy.redactor.summarize(canonical, value)
        if captureLog:
            self.record_event("robot/agentAction", {"action": "executeKeyword", "keyword": keyword})
        return {
            "status": "PASS",
            "returnValueRepr": self.policy.redactor.summarize("return", result),
            "assigned": assignments,
        }

    def execute_snippet(self, snippet: str, frameId: int | None = None, timeoutSec: int | None = None) -> dict[str, Any]:
        self.policy.ensure_write()
        self._ensure_paused()
        body = parse_snippet(snippet)
        result = None
        for node in body:
            result = self._execute_node(node)
        self.record_event("robot/agentAction", {"action": "executeSnippet"})
        return {"status": "OK", "resultRepr": self.policy.redactor.summarize("result", result)}

    def _execute_node(self, node: Any) -> Any:
        kind = type(node).__name__
        if kind in {"KeywordCall", "Keyword"}:
            keyword_name = getattr(node, "keyword", None) or getattr(node, "name", None)
            result = self.keywords.execute(self, keyword_name, tuple(node.args))
            for target_name in node.assign:
                canonical = self._canonical_name(target_name)
                self.data.local_variables[canonical] = result
            return result
        if kind == "If":
            return self._execute_if(node)
        if kind == "IfBranch":
            return self._execute_if_branch(node)
        if kind == "For":
            return self._execute_for(node)
        raise AgentDebugError("unsupported_node", f"Unsupported snippet node: {kind}")

    def _execute_if(self, node: Any) -> Any:
        for branch in node.body:
            if self._branch_matches(branch):
                return self._execute_if_branch(branch)
        return None

    def _execute_if_branch(self, branch: Any) -> Any:
        result = None
        for child in branch.body:
            result = self._execute_node(child)
        return result

    def _branch_matches(self, branch: Any) -> bool:
        condition = getattr(branch, "condition", None)
        if condition is None:
            return True
        return bool(evaluate_expression(condition, self._build_variables()))

    def _execute_for(self, node: Any) -> Any:
        if node.flavor != "IN":
            raise AgentDebugError("unsupported_for", f"Unsupported FOR flavor: {node.flavor}")
        assign_targets = getattr(node, "assign", None) or getattr(node, "variables", ())
        iterable_values = [self.resolve_argument(value) for value in node.values]
        result = None
        for value in iterable_values:
            if len(assign_targets) != 1:
                raise AgentDebugError("unsupported_for", "Only single-variable FOR loops are supported.")
            canonical = self._canonical_name(assign_targets[0])
            self.data.local_variables[canonical] = value
            for child in node.body:
                result = self._execute_node(child)
        return result

    def _ensure_paused(self, read_only_ok: bool = False) -> None:
        if self.data.state != SessionState.PAUSED:
            raise AgentDebugError("not_paused", "This operation is only allowed while the debug session is paused.")
