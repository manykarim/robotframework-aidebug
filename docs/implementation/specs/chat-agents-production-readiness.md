# Chat Agents Production Readiness

## Purpose

This document specifies the `M8` production-readiness criteria for chat-agent integration.

It converts the prior phase specs into operational release requirements.

## Release Artifacts

The release should produce, as applicable:

- VS Code extension package
- Python package for backend and MCP server
- offline-installable artifacts where supported
- release notes with compatibility declarations
- troubleshooting documentation

## Documentation Requirements

User-facing documentation must cover separately:

1. native VS Code LM tool usage
2. chat participant usage
3. MCP `stdio` usage
4. MCP `HTTP` usage if enabled
5. bridge-mode requirements with RobotCode
6. standalone/embedded limitations if any remain
7. safety and confirmation behavior
8. troubleshooting and diagnostics collection

## Operational Diagnostics

The product should expose or document:

- output/log channels
- correlation ids
- audit log access path
- compatibility diagnostics
- MCP server startup diagnostics

## CI And Release Requirements

Release automation should validate at minimum:

- contract/spec drift checks where possible
- shared-core tests
- native surface tests
- MCP protocol tests
- selected end-to-end journeys
- benchmark/payload regression checks
- package build and installation smoke tests

## Upgrade And Rollback Requirements

1. Contract version changes must be documented.
2. Breaking changes require migration notes.
3. Rollback instructions must be available for:
   - VSIX downgrade
   - Python package downgrade
   - MCP HTTP disablement

## Support Statement

The release must declare:

- supported host surfaces
- supported versions/ranges
- known limitations
- unsupported configurations
- data-handling and exposure assumptions

## Pre-Release Checklist

1. `M0` contracts approved
2. `M1` shared-core tests green
3. `M2` and `M3` native-surface journeys green
4. `M4` participant journeys green if participant is shipped
5. `M5` MCP stdio journeys green if MCP is shipped
6. `M6` HTTP and discovery gates green if advertised
7. `M7` hardening gates green
8. installation docs reviewed against a clean environment
9. release notes include compatibility matrix and known issues

## Post-Release Readiness

The team should be able to answer quickly:

- how to diagnose a failed tool invocation
- how to identify a policy denial versus runtime failure
- how to disable risky surfaces quickly
- how to verify the current contract version
- how to reproduce a reported compatibility issue

## Release Gate

`M8` is complete only when:

1. installation and usage docs are accurate
2. release automation covers every advertised surface
3. operational diagnostics are documented and testable
4. rollback and compatibility guidance are complete
5. the shipped surface area matches what the docs claim
