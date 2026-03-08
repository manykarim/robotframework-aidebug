from __future__ import annotations

import pytest

from robotframework_aidebug.models import AgentMode, PolicyConfig
from robotframework_aidebug.policy import AgentDebugError, PolicyGate


def test_read_only_mode_blocks_write_operations() -> None:
    gate = PolicyGate(PolicyConfig(mode=AgentMode.READ_ONLY))
    with pytest.raises(AgentDebugError, match="fullControl"):
        gate.ensure_write()


def test_untrusted_workspace_blocks_reads() -> None:
    gate = PolicyGate(PolicyConfig(workspace_trusted=False))
    with pytest.raises(AgentDebugError, match="Workspace trust"):
        gate.ensure_read()


def test_redactor_masks_secrets_and_truncates_long_values() -> None:
    gate = PolicyGate(PolicyConfig(max_value_chars=10))
    assert gate.redactor.summarize("api_token", "abcd") == "<redacted>"
    assert gate.redactor.summarize("status", "abcdefghijklmnopqrstuvwxyz") == "'abcdef..."
