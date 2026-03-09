# ADR-002: Keep The Product Standalone And Avoid A Hard Extension Dependency

- Status: Accepted
- Date: 2026-03-08

## Context

The product must be installable without the VS Code Marketplace and must remain independently distributable.

A hard dependency on the RobotCode VS Code extension would create several problems:

1. The product would no longer be operationally independent.
2. Manual install flows would become more fragile.
3. The extension would still lack a stable public integration API and would push the design toward private imports.

At the same time, RobotCode is a valid optional integration target and a valid Python runtime dependency candidate for the embedded mode.

## Decision

`robotframework-aidebug` will remain a standalone package and extension.

1. Do not require `extensionDependencies` on RobotCode for core functionality.
2. Treat RobotCode discovery as optional capability detection.
3. If `Embedded Mode` is built, prefer Python package reuse over VS Code extension coupling.

## Rationale

1. Packaging independence is a product requirement.
2. Stable integration should happen through public VS Code APIs and DAP, not private extension internals.
3. Python package reuse keeps the runtime independent from Marketplace installation state.

## Consequences

### Positive

- Users can install from local artifacts, private channels, or future Marketplace publication.
- The extension can degrade gracefully when RobotCode is absent.
- The product identity remains clear.

### Negative

- Some bridge-mode features will be unavailable unless RobotCode is installed and actively used for the session.
- Capability detection and fallback UX must be explicit.

## Operational Rule

Bridge-mode features must always surface a precise capability reason, for example:

- no active debug session
- active session is not `robotcode`
- RobotCode version is unsupported
- session is running instead of paused
