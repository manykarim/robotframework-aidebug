from __future__ import annotations

import json
import uuid
from typing import Any

from .policy import AgentDebugError

READ_ONLY_TOOLS = {
    "get_state",
    "get_variables_snapshot",
    "get_runtime_context",
    "get_capabilities",
    "get_audit_log",
}

DEFAULT_TOKEN_BUDGETS: dict[str, int] = {
    "get_state": 400,
    "get_variables_snapshot": 800,
    "get_runtime_context": 1600,
    "get_capabilities": 400,
    "get_audit_log": 800,
    "control_execution": 400,
    "execute_keyword": 800,
    "execute_page_script": 1200,
    "execute_snippet": 1600,
    "set_variable": 400,
}

ERROR_CODE_MAP = {
    "disabled": ("POLICY_MODE_DENIED", "denied"),
    "read_only": ("POLICY_MODE_DENIED", "denied"),
    "untrusted_workspace": ("WORKSPACE_TRUST_REQUIRED", "denied"),
    "not_paused": ("MUTATION_REQUIRES_PAUSED_SESSION", "denied"),
    "no_session": ("SESSION_NOT_FOUND", "failure"),
    "rate_limit": ("QUEUE_REJECTED", "failure"),
    "unknown_command": ("INVALID_ARGUMENT", "failure"),
    "invalid_arguments": ("INVALID_ARGUMENT", "failure"),
    "unknown_reference": ("INVALID_ARGUMENT", "failure"),
    "invalid_reference": ("INVALID_ARGUMENT", "failure"),
}


def new_correlation_id() -> str:
    return uuid.uuid4().hex


def estimate_tokens(payload: Any) -> int:
    return max(1, len(json.dumps(payload, separators=(",", ":"), default=str)) // 4)



def contains_redaction(payload: Any) -> bool:
    if isinstance(payload, dict):
        return any(contains_redaction(value) for value in payload.values())
    if isinstance(payload, list):
        return any(contains_redaction(value) for value in payload)
    return payload == "<redacted>"



def canonical_error(error: AgentDebugError | Exception) -> tuple[str, str, bool]:
    if isinstance(error, AgentDebugError):
        code, status = ERROR_CODE_MAP.get(error.code, (error.code.upper(), "failure"))
        return code, status, code not in {"POLICY_MODE_DENIED", "WORKSPACE_TRUST_REQUIRED"}
    return "INTERNAL_ERROR", "failure", False



def summarize_denial(code: str) -> str:
    return {
        "POLICY_MODE_DENIED": "The current control mode does not allow this action.",
        "WORKSPACE_TRUST_REQUIRED": "Workspace trust is required before this action is allowed.",
        "MUTATION_REQUIRES_PAUSED_SESSION": "The target debug session must be paused before this action is allowed.",
    }.get(code, "The action was denied by policy.")



def make_envelope(
    *,
    tool: str,
    status: str,
    payload: Any | None = None,
    correlation_id: str | None = None,
    truncated: bool = False,
    redacted: bool = False,
    duration_ms: float = 0.0,
    surface: str = "mcp",
    error_code: str | None = None,
    error_message: str | None = None,
    retryable: bool | None = None,
    continuation: dict[str, Any] | None = None,
) -> dict[str, Any]:
    envelope: dict[str, Any] = {
        "status": status,
        "tool": tool,
        "correlation_id": correlation_id or new_correlation_id(),
        "contract_version": "1.0.0",
        "session_id": "demo-session",
        "truncated": truncated,
        "redacted": redacted,
        "duration_ms": round(duration_ms, 3),
        "surface": surface,
    }
    if payload is not None and status in {"success", "partial"}:
        envelope["payload"] = payload
    if continuation is not None:
        envelope["continuation"] = continuation
    if error_code is not None:
        envelope["error"] = {
            "code": error_code,
            "message": error_message or error_code,
            "retryable": bool(retryable),
            "remediation": summarize_denial(error_code) if status == "denied" else None,
        }
        if envelope["error"]["remediation"] is None:
            envelope["error"].pop("remediation")
    return envelope



def bounded_envelope(tool: str, payload: Any, *, surface: str = "mcp") -> dict[str, Any]:
    redacted = contains_redaction(payload)
    truncated = bool(payload.get("truncated", False)) if isinstance(payload, dict) else False
    status = "partial" if truncated else "success"
    continuation = None
    if truncated:
        continuation = {
            "reason": "item_cap",
            "next_hint": "Request a smaller scope, lower item limit, or a narrower follow-up call.",
        }
    return make_envelope(
        tool=tool,
        status=status,
        payload=payload,
        truncated=truncated,
        redacted=redacted,
        surface=surface,
        continuation=continuation,
    )
