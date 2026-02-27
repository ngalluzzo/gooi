# Changelog

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
