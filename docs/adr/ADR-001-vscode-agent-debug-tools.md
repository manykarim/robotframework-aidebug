# ADR-001: Adopt Dual-Mode Integration With Bridge First

- Status: Accepted
- Date: 2026-03-08

## Context

`robotframework-aidebug` must support live Robot Framework debugging in VS Code while remaining a separate product.

The available architectural options are:

1. `Bridge Mode`
   A standalone extension talks to an active RobotCode debug session through stable VS Code debug APIs and DAP requests.
2. `Embedded Mode`
   The product contributes its own debug type and launches its own adapter, while reusing RobotCode Python packages where practical.
3. `Greenfield Adapter`
   The product implements a new Robot Framework debug adapter from scratch.

The prior analysis of RobotCode shows that live debugging, paused-context evaluation, variable inspection, stepping, `setVariable`, runtime completions, and custom-event synchronization already exist there. The official VS Code debugger model confirms that a custom debug adapter is feasible, but does not make a greenfield adapter strategically sound.

## Decision

Adopt a dual-mode architecture.

1. Deliver `Bridge Mode` first.
2. Design `Embedded Mode` as a planned second mode.
3. Reject a greenfield adapter as the primary implementation strategy.

## Rationale

1. `Bridge Mode` is the fastest credible path to live debug value.
2. `Embedded Mode` preserves long-term independence from RobotCode's VS Code extension packaging.
3. A greenfield adapter would duplicate the hardest parts of the runtime model, increase maintenance cost, and delay delivery without creating differentiating value.

## Consequences

### Positive

- The product can become useful quickly.
- The domain model stays valid across both modes.
- Independence remains possible without discarding upstream debugger maturity.

### Negative

- Two operating modes increase testing scope.
- The bridge must tolerate RobotCode version drift.
- The embedded path will require compatibility management against upstream Python packages.

## Implications For Design

1. The extension must own a `Session Router` abstraction instead of binding directly to one transport.
2. Tool contracts must be transport-neutral.
3. Security, policy, audit, and truncation rules must behave the same in both modes.
