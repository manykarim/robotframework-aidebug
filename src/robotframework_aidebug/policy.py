from __future__ import annotations

import re
import time
from collections import deque
from dataclasses import dataclass
from typing import Any

from .models import AgentMode, PolicyConfig


class AgentDebugError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class Redactor:
    patterns: tuple[str, ...]
    max_value_chars: int

    def __post_init__(self) -> None:
        self._compiled = tuple(re.compile(pattern, re.IGNORECASE) for pattern in self.patterns)

    def should_redact(self, name: str) -> bool:
        return any(pattern.search(name) for pattern in self._compiled)

    def summarize(self, name: str, value: Any) -> str:
        if self.should_redact(name):
            return "<redacted>"
        rendered = repr(value)
        if len(rendered) <= self.max_value_chars:
            return rendered
        return f"{rendered[: self.max_value_chars - 3]}..."


class RateLimiter:
    def __init__(self, limit: int) -> None:
        self.limit = limit
        self._timestamps: deque[float] = deque()

    def check(self) -> None:
        now = time.time()
        cutoff = now - 60.0
        while self._timestamps and self._timestamps[0] < cutoff:
            self._timestamps.popleft()
        if len(self._timestamps) >= self.limit:
            raise AgentDebugError("rate_limit", "Write or execute rate limit exceeded for this session.")
        self._timestamps.append(now)


class PolicyGate:
    def __init__(self, config: PolicyConfig) -> None:
        self.config = config
        self.redactor = Redactor(config.redact_patterns, config.max_value_chars)
        self.rate_limiter = RateLimiter(config.max_write_actions_per_minute)

    def ensure_read(self) -> None:
        if not self.config.enabled or self.config.mode == AgentMode.OFF:
            raise AgentDebugError("disabled", "Agent debugging is disabled.")
        if not self.config.workspace_trusted:
            raise AgentDebugError("untrusted_workspace", "Workspace trust is required for agent debugging.")

    def ensure_write(self) -> None:
        self.ensure_read()
        if self.config.mode != AgentMode.FULL_CONTROL:
            raise AgentDebugError("read_only", "This operation requires fullControl mode.")
        self.rate_limiter.check()
