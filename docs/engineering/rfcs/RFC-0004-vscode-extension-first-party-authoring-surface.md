# RFC-0004: VS Code Extension First-Party Authoring Surface

## Metadata

- RFC: `RFC-0004`
- Title: `VS Code Extension First-Party Authoring Surface`
- Status: `Draft`
- Owners: `Product Platform`
- Reviewers: `Product`, `Developer Experience`, `Runtime Platform`
- Created: `2026-02-26`
- Updated: `2026-02-26`
- Target release: `Authoring Milestone M4`
- Related:
  - Foundation: [RFC-0001-capability-contract-and-provider-runtime-interface.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0001-capability-contract-and-provider-runtime-interface.md)
  - Runtime pipeline: [RFC-0002-entrypoint-execution-pipeline.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0002-entrypoint-execution-pipeline.md)
  - Authoring intelligence: [RFC-0003-product-authoring-intelligence-lsp-and-capability-index.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0003-product-authoring-intelligence-lsp-and-capability-index.md)
  - Standards: [commit-and-tsdoc-standards.md](/Users/ngalluzzo/repos/gooi/docs/engineering/commit-and-tsdoc-standards.md)

## Problem and context

Gooi has deterministic authoring contracts and handlers, but no shippable first-party
editor surface. Product teams still depend on raw YAML editing without a production
extension distribution path.

Without a first-party VS Code extension:

1. Authoring intelligence is not available as a daily workflow surface.
2. Capability discovery, rename safety, and diagnostics parity do not reach end users.
3. Adoption depends on internal tooling instead of a standard editor install path.

## Goals

1. Ship a production VS Code extension backed by existing Gooi authoring handlers.
2. Keep extension behavior contract-driven and deterministic across local and CI.
3. Support core authoring flows: completion, diagnostics, hover, definition, references,
   code lenses, and rename.
4. Use Bun for build and bundling for extension artifacts.
5. Release via Marketplace with versioned packaging and rollback-safe semantics.

## Non-goals

1. Supporting non-VS Code editors in this RFC.
2. Building custom UI panes beyond essential command and lens flows.
3. Replacing authoring core logic in `@gooi/language-server`.
4. Adding a separate CI pipeline for conformance/perf beyond existing test gates.

## Product outcomes and success metrics

Product outcomes:

1. Product engineers can install and use Gooi authoring intelligence in VS Code.
2. Local editor behavior matches CI behavior under the same lockfile/snapshots.

Success metrics:

1. Extension activation p95 `< 1500ms` on reference workspace.
2. Completion response p95 `< 50ms` for active-file paths.
3. Diagnostics update p95 `< 200ms` after single-file edit.
4. Rename success rate `100%` for supported renameable symbols in conformance fixtures.
5. Crash-free extension session rate `>= 99.5%` per release.

## Proposal

Introduce a first-party VS Code extension app that adapts VS Code LSP transport to
existing Gooi authoring handlers.

High-level behavior:

1. Extension activates on Gooi language files and starts Gooi authoring server process.
2. Extension client forwards document lifecycle, completion, diagnostics, navigation,
   lens, and rename requests.
3. Server uses existing lockfile parity policy:
   - read-path features remain available in degraded mode.
   - runtime-backed lens commands are blocked on mismatch.
4. Extension command surface includes:
   - show providers for capability
   - show affected queries for signal
   - run query/mutation (guarded by parity policy)

Deterministic behavior rules:

1. `didChange` document version order is authoritative.
2. Completion list ordering is deterministic for identical input state.
3. Diagnostics ordering is stable by `path`, then `code`, then `message`.
4. `prepareRename` preflight runs before edit generation and rejects unsafe operations.
5. Settings precedence is deterministic:
   - workspace settings
   - user settings
   - extension defaults

## Ubiquitous language

1. `Authoring extension`: first-party VS Code plugin for Gooi authoring.
2. `Extension adapter`: VS Code client boundary translating editor API to typed requests.
3. `Authoring server`: process exposing typed authoring handlers.
4. `Parity state`: lockfile/snapshot consistency status used for degraded mode behavior.
5. `Runtime-backed lens`: lens action that requires runtime command execution permissions.

## Boundaries and ownership

- Surface adapters:
  - `apps/gooi-vscode-extension` owns VS Code API integration, command registration,
    activation lifecycle, and client transport.
- Kernel/domain runtime:
  - `@gooi/language-server` owns authoring semantics and typed operations.
- Capability adapters:
  - Not loaded directly by extension; consumed through compiled snapshots/index.
- Host/platform adapters:
  - Process spawn, filesystem watch, telemetry sink, and package publish plumbing.

Must-not-cross constraints:

1. Extension adapter must not implement core authoring semantics.
2. Authoring server must not depend on VS Code API types.
3. Extension commands must not bypass parity or rename safety checks.
4. Public API surfaces must use `package.json` exports, no barrel files.

## Contracts and typing

Boundary schema authority:

1. Zod is required for all extension IO contracts.
2. JSON Schema may be emitted for docs/interchange only; Zod remains source of truth.

Contracts:

1. Extension settings schema (`GooiExtensionSettings@1.0.0`).
2. Command payload schemas for command args/results.
3. LSP request/response envelopes remain aligned with authoring envelope versions.
4. Error taxonomy extends existing authoring errors with extension adapter errors:
   - `extension_activation_error`
   - `extension_transport_error`
   - `unsupported_extension_capability_error`

Versioning and compatibility:

1. Extension major version tracks incompatible command/settings contract changes.
2. Extension declares minimum supported authoring artifact versions.
3. Mismatch emits deterministic diagnostics and blocks runtime-backed commands.

Serialization rules:

1. Stable key ordering for emitted JSON artifacts.
2. Lexical sorting for capability/provider lists shown in extension UI payloads.

## API and module plan

Feature-oriented layout:

1. `apps/gooi-vscode-extension/src/activation/activate-extension.ts`
2. `apps/gooi-vscode-extension/src/client/create-language-client.ts`
3. `apps/gooi-vscode-extension/src/commands/register-authoring-commands.ts`
4. `apps/gooi-vscode-extension/src/settings/parse-extension-settings.ts`
5. `apps/gooi-vscode-extension/src/telemetry/emit-extension-event.ts`
6. `packages/lsp` remains core authoring API.
7. `packages/conformance/src/authoring-conformance` remains acceptance authority.

Bundling and build:

1. Build and bundle use Bun (`bun build`) only.
2. Extension package build outputs deterministic `dist/` assets.
3. Release packaging runs via `bunx vsce` from built output.

Public API exposure:

1. Extension internals stay app-private; shared modules expose explicit subpath exports.
2. No barrel files.

## Delivery plan and rollout

Phase execution pattern (required for every phase):

1. Contracts first:
   - add/adjust Zod IO contracts and exported types before implementation.
2. Fixtures before tests:
   - add deterministic fixture workspaces/payloads before writing test assertions.
3. TDD sequence:
   - write failing unit/integration/E2E tests against contracts.
   - implement minimal production code to satisfy tests (no stubs).
   - iterate until tests and conformance are green.
4. Product-feature module discipline:
   - keep modules feature-scoped, explicit boundaries, and no barrel files.
5. Documentation and release hygiene:
   - update package README and TSDoc-facing module docs for changed public APIs.
   - add a changeset for user-visible behavior changes.
6. Phase gate:
   - phase does not exit until all existing CI quality gates pass.

Phase 1: Extension scaffold and typed adapter contracts

- Entry criteria:
  - RFC-0003 implementation is merged in main.
  - Existing authoring handlers and conformance tests are green.
- Exit criteria:
  - Extension activates and language client starts against fixture workspace.
  - Phase 1 unit/integration tests are green in CI.
- Deliverables:
  - extension manifest, activation entrypoint, typed settings/command contracts.
  - fixture workspace for activation/lifecycle tests.
  - phase-specific tests and changeset.

Phase 2: Core authoring flows in extension

- Entry criteria:
  - Phase 1 merged.
- Exit criteria:
  - completion/diagnostics/navigation/rename/lens flows work via VS Code client.
  - conformance suite remains green through existing `@gooi/conformance` tests.
- Deliverables:
  - command wiring, lens resolution, rename routing, diagnostics publishing.
  - deterministic protocol fixtures for completion/rename/lens flows.
  - phase-specific tests and changeset.

Phase 3: Release readiness and publish

- Entry criteria:
  - Phase 2 conformance and integration tests green.
- Exit criteria:
  - signed extension artifact and Marketplace publication process validated.
  - release smoke tests and rollback drill documented and green.
- Deliverables:
  - release docs, publish workflow wiring, rollback/runbook docs.
  - package README badges and install/verify instructions.
  - phase-specific tests and changeset.

## Test strategy and acceptance criteria

Coverage expectations:

1. Unit tests for extension settings parsing, command payload parsing,
   and activation guards.
2. Integration tests for extension lifecycle and `didChange -> diagnostics -> completion` loop.
3. Protocol E2E tests for completion, lens, and rename message flows.

Conformance:

1. Reuse `@gooi/conformance` authoring suite as acceptance gate.
2. Must pass completion correctness, diagnostics parity, lens correctness,
   rename safety, expression symbol resolution, and signal impact chain checks.

Determinism:

1. Golden tests for completion ordering and command payload shapes.
2. Lockfile mismatch behavior tests for degraded mode and command blocking.

Definition of done:

1. Extension installable from VSIX in local smoke environment.
2. All existing CI quality gates pass with extension included.
3. Authoring conformance suite passes.
4. Latency threshold tests pass in main test suite.

## Operational readiness

Observability:

1. Extension activation timing and request latency events.
2. Error counts by stable error code.

Failure handling:

1. Graceful failure when server fails to start.
2. Deterministic fallback messaging for transport and mismatch errors.

Security:

1. No shell execution from untrusted spec content.
2. Only typed command payloads accepted.
3. Runtime-backed commands enforce parity and policy gates.

Runbooks:

1. Extension activation failure troubleshooting.
2. Lockfile mismatch and stale artifact remediation.
3. Release rollback via prior Marketplace version restore.

Alert thresholds:

1. Activation p95 `> 1500ms` for 15 minutes.
2. Completion p95 `> 50ms` for 15 minutes.
3. Diagnostics p95 `> 200ms` for 15 minutes.
4. Crash-free session rate `< 99.5%` per release window.

## Risks and mitigations

1. Risk: VS Code adapter drifts from server contracts.
   Mitigation: strict Zod parsing at adapter boundaries + protocol E2E suite.
2. Risk: release packaging inconsistencies across environments.
   Mitigation: Bun-only build pipeline with lockfile pinning and deterministic outputs.
3. Risk: runtime-backed commands invoked under stale artifacts.
   Mitigation: parity-aware command blocking and explicit stale diagnostics.
4. Risk: extension latency regressions over time.
   Mitigation: latency threshold tests in standard test suite.

## Alternatives considered

1. Build extension with webpack/esbuild instead of Bun.
   Rejected: violates repo-standard build tool direction.
2. Fork logic inside extension instead of reusing authoring package.
   Rejected: duplicates semantics and risks behavioral drift.
3. Ship CLI-only authoring UX.
   Rejected: does not solve daily product-team editor workflow.

## Open questions

None.

## Decision log

- `2026-02-26` - RFC created to ship first-party VS Code authoring surface.
- `2026-02-26` - Bundling/build strategy fixed to Bun-only.
- `2026-02-26` - Conformance gate fixed to existing `@gooi/conformance` package.
- `2026-02-26` - Latency enforcement fixed to standard test suite, not separate CI pipeline.
- `2026-02-26` - Resolved publishing sequence: ship VS Code Marketplace first, then Open VSX in a follow-up release wave.
- `2026-02-26` - Resolved telemetry default for initial release: opt-in only.
