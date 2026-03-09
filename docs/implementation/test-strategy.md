# Test Strategy

## Test Layers

### 1. Experiment Validation

Purpose:

- confirm Robot Framework parsing and evaluation assumptions with `uv run`
- detect upstream behavior changes early

Examples:

- raw snippet versus wrapped snippet parsing
- variable replacement versus expression syntax
- listener and scope behavior as needed

### 2. Unit Tests

Purpose:

- validate policy, redaction, truncation, schema validation, and capability logic

Targets:

- command normalization
- policy evaluation
- session selection
- snippet wrapper generation
- audit serialization

### 3. Contract Tests

Purpose:

- ensure both transports implement the same domain command contracts

Targets:

- success payload shape
- failure code shape
- timeout handling
- unsupported capability reporting

### 4. Extension Integration Tests

Purpose:

- validate tool registration, enablement, and session routing in VS Code

Targets:

- no active session
- active non-Robot session
- active RobotCode session
- degraded session state

### 5. End-To-End User Journey Tests

Purpose:

- validate the complete live debugging workflow from user action to runtime result

Required journeys:

1. diagnose paused failure
2. inspect variables safely
3. run diagnostic keyword
4. execute multi-line snippet
5. mutate variable and resume
6. fallback from bridge mode to embedded mode when configured
7. deny unsafe action in `readOnly` mode
8. survive transient read failure and recover
9. surface timeout cleanly without duplicate execution
10. handle version mismatch with precise remediation guidance

## Non-Functional Validation

### Performance

- benchmark command latency at helper and transport levels
- track p50, p95, and max latency
- validate caching impact for repeated snapshot and snippet operations

### Reliability

- inject transport failures
- inject slow or missing `robot/sync` acknowledgements
- validate retry policy for reads only
- validate degraded-state transitions

### Security

- assert secret redaction in tool outputs, logs, and audit trails
- assert policy denials for writes in `readOnly` mode
- assert external gateways remain disabled by default

### Compatibility

Matrix dimensions:

- Robot Framework versions
- RobotCode versions for bridge mode
- VS Code versions
- operating systems used in CI and release validation

## Exit Criteria

No implementation phase is complete until:

1. functional journeys pass
2. non-functional budgets are within threshold
3. version compatibility coverage is updated
4. docs match the tested behavior
