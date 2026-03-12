# Chat Agents Use Cases

## UC-CA-01: Copilot Agent Diagnoses A Paused Failure

1. Agent mode invokes a read-only LM tool.
2. Tool resolves the active debug session.
3. Tool returns bounded state and variable context.
4. Agent summarizes the failure.

## UC-CA-02: Copilot Agent Requests A Risky Runtime Mutation

1. Agent selects a mutating LM tool.
2. `prepareInvocation()` generates a contextual confirmation request.
3. User confirms.
4. Runtime mutation executes.
5. Tool returns bounded post-mutation summary.

## UC-CA-03: User Chats With `@robotdebug`

1. User addresses the participant directly.
2. Participant interprets intent and orchestrates tools.
3. Participant returns narrative guidance, progress, and follow-up actions.

## UC-CA-04: Cline Calls The MCP Server

1. MCP client discovers tools and instructions.
2. Client invokes read-only or mutating MCP tools.
3. MCP surface maps to the shared invocation planner.
4. Result envelopes are returned in MCP-compatible form.

## UC-CA-05: No Live Session Exists

1. Agent asks for runtime state.
2. Application layer cannot resolve a live debug session.
3. System returns a capability-aware explanation and may provide static context or remediation instructions.

## UC-CA-06: Tool Output Risks Exceeding Budget

1. Tool invocation returns a large result.
2. Result shaping truncates or summarizes it.
3. System offers narrower follow-up tools for deeper inspection.
