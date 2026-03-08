from __future__ import annotations

from .models import AgentMode, PolicyConfig
from .server import DebugServer
from .session import AgentDebugSession
from .tools import AgentToolbox, SessionRouter


def build_demo_toolbox(
    mode: AgentMode = AgentMode.FULL_CONTROL,
    policy: PolicyConfig | None = None,
) -> AgentToolbox:
    session = AgentDebugSession(
        title="checkout-demo",
        source="tests/checkout.robot",
        policy=policy or PolicyConfig(mode=mode),
    )
    session.add_demo_data()
    server = DebugServer(session)
    router = SessionRouter(server=server)
    return AgentToolbox(router)
