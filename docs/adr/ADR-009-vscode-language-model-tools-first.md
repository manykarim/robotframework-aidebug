# ADR-009: Make VS Code Language Model Tools The Primary Native Agent Interface

- Status: Accepted
- Date: 2026-03-09

## Context

The VS Code Language Model Tool API is the official extension-native mechanism for exposing agent-callable tools in chat and agent mode. The API supports:

- declarative `contributes.languageModelTools`
- runtime registration with `vscode.lm.registerTool`
- validated JSON input schemas
- `prepareInvocation()` for user confirmation and contextual progress messages
- `toolInvocationToken` for chat-bound tool execution
- token-budget hints for tool output shaping

The current repository already has transport and runtime operations, but it does not yet expose them as LM tools.

## Decision

The first-class native integration for chat agents in VS Code will be a `languageModelTools` suite.

Initial tool families:

1. discovery and diagnosis
2. state and variable inspection
3. runtime completions and namespace context
4. execution control
5. keyword execution and snippet execution
6. scoped variable mutation
7. audit and capability inspection

## Rationale

1. Native tools are how agent mode invokes deterministic extension capabilities.
2. JSON schema input and `prepareInvocation()` fit the security model better than free-form prompt parsing.
3. Tool registration is compatible with both direct `#tool` reference and autonomous agent orchestration.

## Consequences

### Positive

- Strong Copilot and native VS Code agent compatibility.
- Rich user confirmation flow for dangerous operations.
- Explicit schemas improve reliability and testability.

### Negative

- Tool descriptions and schemas become part of the product contract.
- Poor schema design will directly harm agent behavior.
- Tool result size discipline becomes mandatory.

## Design Rule

All mutating or side-effecting tools must implement `prepareInvocation()` and request confirmation with context-specific messaging.
