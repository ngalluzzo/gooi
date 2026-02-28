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
- Added lane-harness conformance suite for L0/L1/L2/L3 matrix execution with
  deterministic lane/check identifiers and baseline reproducibility digests.
- Added determinism conformance suite for repeated artifact/envelope checks with
  typed `conformance_determinism_error` diagnostics.
- Added tiered suite strategy definitions (`smoke`, `full`, `expanded`) with
  runtime/flaky threshold enforcement and gate-role metadata.
- Added marketplace control-plane conformance suite covering listing/catalog/
  certification behavior plus governance-report deterministic serialization.
