from __future__ import annotations

from robotframework_aidebug.demo import build_demo_toolbox
from robotframework_aidebug.models import AgentMode, PolicyConfig


def test_probe_capabilities_reflects_mode() -> None:
    read_only = build_demo_toolbox(policy=PolicyConfig(mode=AgentMode.READ_ONLY))
    full = build_demo_toolbox(policy=PolicyConfig(mode=AgentMode.FULL_CONTROL))

    read_only_caps = read_only.probe_capabilities()
    full_caps = full.probe_capabilities()

    assert read_only_caps["capabilities"]["canReadState"] is True
    assert read_only_caps["capabilities"]["canExecuteKeyword"] is False
    assert full_caps["capabilities"]["canExecuteKeyword"] is True
    assert full_caps["capabilities"]["supportsStructuredRequests"] is True


def test_runtime_completions_include_variables_and_keywords(toolbox) -> None:
    completions = toolbox.get_runtime_completions("stat")
    labels = {item["label"] for item in completions["targets"]}
    assert "${status}" in labels

    keyword_completions = toolbox.get_runtime_completions("log")
    keyword_labels = {item["label"] for item in keyword_completions["targets"]}
    assert "Log" in keyword_labels
    assert "Log Variables" in keyword_labels


def test_audit_log_is_exposed(toolbox) -> None:
    toolbox.evaluate("$retry_count + 1")
    audit = toolbox.get_audit_log(limit=5)
    assert audit["entries"]
    assert audit["entries"][-1]["command"] == "evaluate"
