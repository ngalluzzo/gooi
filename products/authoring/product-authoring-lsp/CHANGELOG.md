# @gooi/product-authoring-lsp

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
