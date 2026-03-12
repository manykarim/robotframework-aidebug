# ADR-013: Budget For Token Usage, Interactive Latency, And Non-Blocking Execution

- Status: Accepted
- Date: 2026-03-09

## Context

Chat agents amplify both latency and payload-size problems. Tool results that are technically correct can still be unusable if they are too large, too slow, or too noisy.

The VS Code LM tool API supports token-budget hints, and the `rf-mcp` project demonstrates explicit token-efficiency and response shaping patterns.

Fresh local experiments in this repository show current helper-layer payloads are small enough to be viable as agent tool responses when bounded:

- state snapshot: about `707` JSON bytes
- bounded variable snapshot: about `318` JSON bytes
- runtime completions: about `1579` JSON bytes
- audit view: about `857` JSON bytes

## Decision

Adopt explicit agent-oriented budgets.

### Payload Budgets

- default state result: target under `250` tokens
- default variable snapshot: target under `250` tokens
- default completions result: target under `500` tokens
- audit result: target under `300` tokens

### Latency Budgets

- read-only LM tool: p95 under `300 ms`
- mutating LM tool dispatch overhead excluding runtime keyword cost: p95 under `400 ms`
- MCP stdio round trip: p95 under `500 ms`
- MCP HTTP round trip: p95 under `800 ms`

### Execution Rules

- streaming or progress updates for operations likely to exceed one second
- cancellation propagation wherever the host API allows it
- no blocking work on the extension event loop while waiting for tool completion

## Consequences

- Tool results must be intentionally summarized.
- Large collections require pagination, scope filters, or explicit deep-inspection tools.
- Performance validation must include host-transport overhead, not just Python helpers.
