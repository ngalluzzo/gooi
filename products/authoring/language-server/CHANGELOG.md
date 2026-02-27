# @gooi/language-server

## 0.2.0

### Minor Changes

- 04cf668: Close RFC-0003 phase-4 acceptance gaps with session integration tests, protocol E2E coverage, completion golden fixtures, authoring conformance checks, and latency threshold tests.
- 04cf668: Implement RFC-0003 Phase 3 authoring read-path package with deterministic completion, hover, diagnostics, and symbol navigation handlers backed by capability index, symbol graph, and authoring lockfile parity contracts.
- 04cf668: Implement RFC-0003 Phase 4 authoring action handlers with deterministic code lens list/resolve, prepareRename preflight, and rename workspace edits including rename conflict diagnostics.

### Patch Changes

- b6b2b2c: Add protocol support for `textDocument/documentSymbol` and route it through the authoring protocol server to keep extension symbol flows aligned with RFC-0004 feature coverage.
  - @gooi/capability-index@0.1.1

## 0.1.0

### Added

- Initial RFC-0003 Phase 3 read-path contracts and handlers.
- Snapshot-driven completion and completion resolve helpers.
- Read-path diagnostics generation with lockfile parity degraded mode.
- Symbol navigation helpers for hover, definition, references, and symbol search.
- Fixture-first tests for completion, diagnostics, and navigation behavior.
- Phase 4 code lens list/resolve handlers for run, providers, and affected-query actions.
- Phase 4 rename preflight and workspace-edit handlers with collision diagnostics.
- Fixture-first tests for code lenses, prepare rename, and rename edit generation.
- Integration session support for `didOpen` / `didChange` diagnostics and completion loops.
- Protocol E2E test server for message-level authoring handler routing.
- Completion ordering golden fixture and p95 latency threshold tests in suite.
