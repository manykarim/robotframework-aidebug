# ADR-006: Distribute As Separate Installable Packages With Marketplace Readiness

- Status: Accepted
- Date: 2026-03-08

## Context

The product must be usable without the Marketplace while remaining ready for future Marketplace publication.

The architecture also separates concerns naturally:

- Python runtime and backend logic
- VS Code extension and UI integration

## Decision

Distribute the product as separate installable packages.

1. Python package for backend and shared runtime logic
2. VS Code extension package for editor integration
3. optional future bundled distribution for convenience, not as the primary architecture

## Packaging Rules

1. Local and CI installs must work from repository artifacts.
2. `uv` is the canonical Python environment and dependency manager for local development and validation.
3. The extension must build into a `.vsix` suitable for manual installation.
4. Marketplace metadata should exist, but marketplace availability must not be assumed.

## Consequences

### Positive

- Better operational independence.
- Cleaner release boundaries.
- Easier support for private distribution channels.

### Negative

- Version compatibility rules between extension and backend must be explicit.
- Install instructions must be clear because users may install parts separately.
