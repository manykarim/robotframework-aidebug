# Architecture Index

## Purpose

This repository now treats [docs/research.md](/home/many/workspace/robotframework-aidebug/docs/research.md) as the source research document and converts it into an implementation-ready documentation set for a future RobotCode enhancement:

- AI agents can inspect and control a live Robot Framework debug session.
- The primary integration point is the VS Code extension.
- The protocol boundary remains DAP, extended with additive RobotCode-specific requests.
- Safety, auditability, and least privilege are first-class requirements.

The repository now also contains a working local reference implementation under [src/robotframework_aidebug](/home/many/workspace/robotframework-aidebug/src/robotframework_aidebug). The docs remain the architecture source of truth, and the package demonstrates the design locally without depending on the full RobotCode monorepo.

It also contains a separate standalone VS Code extension package under [vscode-extension](/home/many/workspace/robotframework-aidebug/vscode-extension), packaged and validated as a manual-install `.vsix` artifact for non-Marketplace installation.

## Verified Assumptions

The following assumptions were confirmed locally with `uv` and `robotframework==7.4.2` and are treated as verified design constraints:

1. `robot.api.parsing.get_model()` can parse full suites, and `robot.running.TestSuite.from_model()` can materialize runnable suites from those models.
2. Raw body fragments such as `Log    hi` or `IF    True` are not parsed as executable test bodies on their own; they are treated as implicit comments unless wrapped in a synthetic suite/test structure.
3. Listener classes without an explicit `ROBOT_LISTENER_API_VERSION` behave like v3 listeners in Robot Framework 7.4.2, receiving model/result objects rather than v2 string/dict arguments.
4. Variable replacement and expression evaluation are related but not interchangeable:
   - `${NAME}` works with `replace_scalar()` and `replace_string()`.
   - `$NAME` should be used with `evaluate_expression()` when expression semantics are required.
5. Variable scopes behave as expected in a single Robot execution:
   - test variables do not leak to later tests,
   - suite variables are visible within the same suite,
   - global variables survive across suites in the same run.

The detailed evidence is in [docs/implementation/experiments.md](/home/many/workspace/robotframework-aidebug/docs/implementation/experiments.md).

## Document Map

### ADRs

- [ADR-001: Host Agent Debug Control In The VS Code Extension](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-001-vscode-agent-debug-tools.md)
- [ADR-002: Add Structured RobotCode Custom DAP Requests](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-002-structured-custom-dap-requests.md)
- [ADR-003: Enforce Safety, Redaction, And Auditing By Default](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-003-safety-redaction-audit.md)
- [ADR-004: Deliver Incrementally With Read-Only First And Experiment-Backed Design](/home/many/workspace/robotframework-aidebug/docs/adr/ADR-004-phased-delivery-experiment-led.md)

### DDD

- [DDD Overview](/home/many/workspace/robotframework-aidebug/docs/ddd/README.md)
- [Context Map](/home/many/workspace/robotframework-aidebug/docs/ddd/context-map.md)
- [Domain Model](/home/many/workspace/robotframework-aidebug/docs/ddd/domain-model.md)
- [Use Cases](/home/many/workspace/robotframework-aidebug/docs/ddd/use-cases.md)
- [Commands And Events](/home/many/workspace/robotframework-aidebug/docs/ddd/commands-and-events.md)

### Implementation

- [Implementation Blueprint](/home/many/workspace/robotframework-aidebug/docs/implementation/blueprint.md)
- [Worked Examples](/home/many/workspace/robotframework-aidebug/docs/implementation/examples.md)
- [Experiment Results](/home/many/workspace/robotframework-aidebug/docs/implementation/experiments.md)
- [Validation](/home/many/workspace/robotframework-aidebug/docs/implementation/validation.md)
- [Benchmark Results](/home/many/workspace/robotframework-aidebug/docs/implementation/benchmark-results.md)

## Recommended Reading Order

1. Start with [docs/research.md](/home/many/workspace/robotframework-aidebug/docs/research.md).
2. Read the ADRs to understand the fixed decisions.
3. Read the DDD set to understand boundaries, language, and behavior.
4. Use the implementation docs when translating the design into code.
