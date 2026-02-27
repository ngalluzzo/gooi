# Changelog

## 0.2.0

### Minor Changes

- 9215e2a: Introduce RFC-0001 foundation packages for Zod-authored capability contracts, binding artifacts, provider runtime activation/invocation enforcement, and provider conformance checks.
- 04cf668: Close RFC-0003 phase-4 acceptance gaps with session integration tests, protocol E2E coverage, completion golden fixtures, authoring conformance checks, and latency threshold tests.

### Patch Changes

- Updated dependencies [9215e2a]
- Updated dependencies [04cf668]
- Updated dependencies [04cf668]
- Updated dependencies [04cf668]
- Updated dependencies [b6b2b2c]
  - @gooi/capability-contracts@0.2.0
  - @gooi/binding@0.2.0
  - @gooi/provider-runtime@0.2.0
  - @gooi/language-server@0.2.0
  - @gooi/capability-index@0.1.1
  - @gooi/spec-compiler@0.1.1
  - @gooi/surface-contracts@0.1.1
  - @gooi/domain-runtime@0.1.1
  - @gooi/entrypoint-runtime@0.1.1

All notable changes to this package are documented in this file.

The format is based on Changesets.

## 0.1.0

### Added

- Authoring conformance suite for RFC-0003 checks:
  completion correctness, diagnostics parity, lens behavior, rename safety,
  expression symbol resolution, and signal impact chain.
- Projection conformance suite for RFC-0010 checks:
  refresh parity, mutation fixture projection outputs, stale-read gating,
  as_of capability enforcement, and duplicate event-key dedupe behavior.
- Expanded projection conformance with history operation contract gating,
  explicit rebuild recovery, and migration-chain replay/gap enforcement checks.
- Added guard conformance suite for RFC-0019 layered guard matrix and semantic
  policy behavior checks.
- Added scenario conformance suite for RFC-0020 trigger/expect/capture semantics,
  persona-generated input lockfile determinism, and typed failure traceability.
