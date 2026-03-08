from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class SessionState(StrEnum):
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"


class AgentMode(StrEnum):
    OFF = "off"
    READ_ONLY = "readOnly"
    FULL_CONTROL = "fullControl"


@dataclass(frozen=True)
class SourceLocation:
    source: str
    line: int
    column: int = 1


@dataclass
class ExecutionItem:
    type: str
    id: str
    name: str
    source: str
    lineno: int


@dataclass
class StackFrame:
    id: int
    name: str
    source: str
    line: int
    column: int = 1


@dataclass
class EventRecord:
    event: str
    body: dict[str, Any]
    ts: float


@dataclass
class AuditEntry:
    timestamp: float
    command: str
    sanitized_arguments: dict[str, Any]
    result: str
    duration_ms: float


@dataclass
class PolicyConfig:
    enabled: bool = True
    mode: AgentMode = AgentMode.FULL_CONTROL
    workspace_trusted: bool = True
    redact_patterns: tuple[str, ...] = ("TOKEN", "PASSWORD", "SECRET")
    max_value_chars: int = 160
    max_items: int = 50
    max_write_actions_per_minute: int = 30


@dataclass
class ReferenceTarget:
    kind: str
    value: Any
    scope: str | None = None


@dataclass
class SessionData:
    thread_id: int = 1
    state: SessionState = SessionState.PAUSED
    stop_reason: str = "breakpoint"
    top_frame: StackFrame = field(
        default_factory=lambda: StackFrame(
            id=1,
            name="Verify totals",
            source="tests/checkout.robot",
            line=28,
            column=1,
        )
    )
    current_item: ExecutionItem = field(
        default_factory=lambda: ExecutionItem(
            type="keyword",
            id="kw-28",
            name="Verify totals",
            source="tests/checkout.robot",
            lineno=28,
        )
    )
    stack_frames: list[StackFrame] = field(default_factory=list)
    local_variables: dict[str, Any] = field(default_factory=dict)
    test_variables: dict[str, Any] = field(default_factory=dict)
    suite_variables: dict[str, Any] = field(default_factory=dict)
    global_variables: dict[str, Any] = field(default_factory=dict)
    recent_events: deque[EventRecord] = field(default_factory=lambda: deque(maxlen=200))
    audit_log: list[AuditEntry] = field(default_factory=list)
