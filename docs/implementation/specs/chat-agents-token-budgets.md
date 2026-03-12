# Chat Agents Token Budgets

## Purpose

This document freezes the default result-shaping budgets for chat-agent surfaces.

The goal is to keep tool outputs useful to models and users without producing unbounded payloads that degrade chat quality, latency, or stability.

## Design Inputs

Local helper-layer baseline from [chat-agents-experiments.md](/home/many/workspace/robotframework-aidebug/docs/implementation/chat-agents-experiments.md):

- `get_state`: about `176` tokens
- `get_variables_snapshot`: about `79` tokens in the current demo fixture
- `get_runtime_context` completions-heavy response: about `394` tokens
- `get_audit_log`: about `214` tokens

These are small local baselines, but real bridge-mode sessions can be materially larger. Budgets must therefore be set by policy, not by recent happy-path measurements.

## Budget Classes

| Class | Target Tokens | Hard Limit | Intended Use |
| --- | --- | --- | --- |
| `compact` | 200 | 400 | state summaries, capability views |
| `standard` | 400 | 800 | variable snapshots, audit summaries |
| `expanded` | 800 | 1600 | bounded context dumps, completion-heavy responses |
| `diagnostic` | 1200 | 2400 | explicit troubleshooting output only |

Rules:

1. Default tool responses should target `compact` or `standard`.
2. `expanded` requires an explicit caller need or host context that benefits from richer detail.
3. `diagnostic` is opt-in and should not be the default for agent-triggered flows.

## Default Tool Budgets

| Tool | Default Class | Typical Hard Caps |
| --- | --- | --- |
| `get_state` | `compact` | `max_log_lines=20`, stack depth `<=10`, scopes `<=5` |
| `get_variables_snapshot` | `standard` | `max_items=20`, scopes `<=4` |
| `get_runtime_context` | `expanded` | completions `<=25`, namespace entries `<=20` per category |
| `get_capabilities` | `compact` | no large collections |
| `get_audit_log` | `standard` | `limit=20` |
| `control_execution` | `compact` | no large payload |
| `execute_keyword` | `standard` | output text `<=800` chars |
| `execute_snippet` | `expanded` | output text `<=1200` chars, assigned variables `<=10` |
| `set_variable` | `compact` | previous/new values bounded and redacted |

## Shaping Rules

1. Prefer summary-first responses.
2. Include only the minimum stack, scope, variable, or completion detail needed for the next decision.
3. When truncating collections, preserve ordering and mark truncation explicitly.
4. When redaction is applied, retain enough structural information for the user to understand what was hidden.
5. For chat participants, prose summaries must still be grounded in the canonical envelope and not invent omitted details.

## Truncation Strategy

### Collections

- keep first `N` items by stable ordering
- set `truncated=true`
- provide a continuation hint

### Text Output

- preserve the leading context and the final error line where possible
- replace omitted middle content with a concise sentinel
- never exceed host-safe maximum size

### Variable Values

- prefer names-only mode if values would exceed the budget materially
- redact secrets before deciding whether to truncate

## Host-Specific Rules

### VS Code LM Tools

- default to the canonical budget class
- use host progress UI instead of dumping long status text
- mutating tool confirmations must not include full payload previews with secrets

### Chat Participant

- participant prose should be shorter than raw tool payloads
- use follow-up suggestions rather than oversized responses

### MCP

- tool results must remain bounded even if the client is permissive
- `stdio` and `HTTP` use the same budget rules by default

## Regression Gates

1. No default tool response may exceed its hard limit in automated fixtures.
2. Payload-shaping regressions must fail tests when they materially exceed class targets.
3. New fields must be evaluated for budget impact before release.
