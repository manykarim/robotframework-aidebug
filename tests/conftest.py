from __future__ import annotations

import pytest

from robotframework_aidebug import AgentMode, build_demo_toolbox


@pytest.fixture()
def toolbox():
    return build_demo_toolbox()


@pytest.fixture()
def read_only_toolbox():
    return build_demo_toolbox(mode=AgentMode.READ_ONLY)
