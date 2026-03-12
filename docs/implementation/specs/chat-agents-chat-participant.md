# Chat Agents Chat Participant Surface

## Purpose

This document specifies the `M4` dedicated chat participant for `robotframework-aidebug`.

The participant is an optional orchestration surface layered on top of the shared core and canonical tools.

## Strategic Role

The participant exists to:

- guide users through debug workflows conversationally
- provide slash commands for common diagnostic flows
- sequence canonical tools when a single tool call is not enough
- summarize results in a human-oriented way

The participant does not exist to:

- replace native LM tools
- bypass policy or confirmation
- invent a private runtime API

## Identity

Recommended participant identity:

- handle: `@robotdebug`
- role: Robot Framework debug specialist
- tone: concise, operational, evidence-based

## Commands

Recommended slash commands:

- `/state`
- `/variables`
- `/context`
- `/capabilities`
- `/recover`
- `/run-keyword`
- `/run-snippet`
- `/set-variable`
- `/step`

Rules:

1. Slash commands must map to canonical tools or a deterministic orchestration flow.
2. Slash commands must not have hidden side effects.
3. Mutating slash commands still require the same confirmation policy.

## Participant Detection

Use participant detection only to improve routing for prompts such as:

- explain the current paused Robot Framework state
- inspect variables at the current breakpoint
- recover from a failing keyword while paused

Detection must not:

- hijack unrelated chat topics
- expose mutating capabilities silently
- imply hidden authority beyond the declared tools

## Orchestration Rules

1. Prefer one tool when one tool is sufficient.
2. Use multi-step orchestration only when it materially improves clarity or task completion.
3. Every tool step must still go through the shared core.
4. The participant must not mutate runtime state as part of a read-only diagnostic flow unless the user or agent explicitly requests it and policy allows it.

## Required Orchestration Flows

### Flow A: Paused-State Diagnosis

1. `get_state`
2. `get_variables_snapshot`
3. `get_runtime_context`
4. concise summary with suggested next steps

### Flow B: Recovery Guidance

1. `get_state`
2. `get_runtime_context`
3. optional read-only inspection of variables
4. if the user explicitly requests mutation, route to the canonical mutating tool with confirmation

### Flow C: Execution Follow-Up

1. `execute_keyword` or `execute_snippet`
2. summarize output
3. suggest `get_state` or variable inspection if the result implies further diagnosis

## Response Rules

1. Participant prose must be shorter than the raw tool payloads.
2. Responses must clearly distinguish facts from suggestions.
3. If information was truncated or redacted, the participant must acknowledge it.
4. Failures and denials must include actionable next steps where possible.
5. Correlation ids should remain available in diagnostics even if not shown in every response.

## Follow-Up Suggestions

Follow-ups should be grounded in actual results, such as:

- `Inspect local variables`
- `Show current keyword context`
- `Step over`
- `Execute a diagnostic keyword`

Do not suggest:

- actions not exposed on the current surface
- actions denied by current policy mode without saying so
- unbounded snippet execution as a generic next step

## Safety Rules

1. The participant may request confirmation but must never self-confirm.
2. The participant must avoid leaking secrets in summaries or confirmation previews.
3. If the host conversation history includes misleading prior statements, the participant must prefer current tool results.
4. Prompt-injection-style content from runtime outputs must not be treated as trusted instructions.

## Test Requirements

### Unit

- slash-command routing
- orchestration plan generation
- response summarization with truncation awareness
- follow-up generation

### Integration

- paused-state diagnosis flow
- recovery flow in `readOnly`
- mutation request escalation with confirmation
- denied mutation flow

### End-To-End

- one human-guided diagnostic conversation
- one guided mutation conversation with confirmation
- one failure conversation where runtime execution fails and the participant recovers with next steps

## Release Gate

The participant is not releasable until:

1. all participant actions route through the shared core
2. read-only and mutating conversation tests pass
3. slash-command help text matches actual supported capabilities
4. summaries remain bounded and policy-aware
