from __future__ import annotations

from robotframework_aidebug.agent_protocol import (
    READ_ONLY_TOOLS,
    bounded_envelope,
    canonical_error,
    contains_redaction,
    estimate_tokens,
    make_envelope,
    summarize_denial,
)
from robotframework_aidebug.policy import AgentDebugError


def test_protocol_helpers_detect_redaction_and_tokens() -> None:
    assert "get_state" in READ_ONLY_TOOLS
    assert estimate_tokens({"hello": "world"}) >= 1
    assert contains_redaction({"secret": "<redacted>"}) is True
    assert contains_redaction({"secret": "value"}) is False


def test_protocol_make_and_bound_envelopes() -> None:
    success = make_envelope(tool="get_state", status="success", payload={"state": "paused"})
    assert success["status"] == "success"
    assert success["payload"]["state"] == "paused"

    partial = bounded_envelope("get_variables_snapshot", {"variables": {}, "truncated": True})
    assert partial["status"] == "partial"
    assert partial["continuation"]["reason"] == "item_cap"


def test_protocol_error_mapping_and_denial_summary() -> None:
    code, status, retryable = canonical_error(AgentDebugError("not_paused", "pause first"))
    assert (code, status, retryable) == ("MUTATION_REQUIRES_PAUSED_SESSION", "denied", True)
    fallback = canonical_error(RuntimeError("boom"))
    assert fallback == ("INTERNAL_ERROR", "failure", False)
    assert "Workspace trust" in summarize_denial("WORKSPACE_TRUST_REQUIRED")
