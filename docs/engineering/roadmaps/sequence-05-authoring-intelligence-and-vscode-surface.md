# Sequence 05: Authoring Intelligence and VS Code Surface

## RFC Alignment

- [RFC-0003](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0003-product-authoring-intelligence-lsp-and-capability-index.md)
- [RFC-0004](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0004-vscode-extension-first-party-authoring-surface.md)

## Epic 1: Capability Index and Symbol Graph Foundation

### Story 1.1: Build unified capability index snapshot
Acceptance criteria:
1. Local and catalog capabilities are unified with collision hard-fail behavior.
2. Index includes provider availability plus trust/certification metadata fields.
3. Snapshot hashing and serialization are deterministic.

### Story 1.2: Build symbol graph for navigation and rename
Acceptance criteria:
1. Symbol graph includes entrypoints, routes, actions, signals, and expression-local symbols.
2. Definition/reference relationships are deterministic and queryable.
3. Rename preflight can reject unsafe refactors before edits are produced.

### Story 1.3: Establish lockfile parity model for authoring
Acceptance criteria:
1. Lockfile tracks artifact and catalog identities required for parity.
2. Mismatch diagnostics are typed and deterministic.
3. Degraded mode behavior is explicit and test-backed.

### Story 1.4: Add reachability/delegation authoring diagnostics
Acceptance criteria:
1. Authoring diagnostics validate capability reachability requirements and delegated-route references.
2. Invalid local/delegated reachability declarations fail with deterministic typed codes.
3. Quick-fix guidance points to resolver/binding requirement contracts when reachability is unsatisfied.

### Story 1.5: Add guard and scenario authoring diagnostics
Acceptance criteria:
1. Authoring diagnostics validate guard/invariant declarations across collection/action/signal/flow/projection surfaces.
2. Scenario/persona references and capture expressions are validated with deterministic typed diagnostics.
3. Guard/scenario quick-fixes and completions are context-aware and contract-safe.

## Epic 2: LSP Service and Command Contracts

### Story 2.1: Implement core LSP methods
Acceptance criteria:
1. Completion, diagnostics, hover, references, symbols, and rename methods are contract-stable.
2. Method responses are deterministic for identical document/version state.
3. Cancellation and version-order correctness are enforced.

### Story 2.2: Implement code lens and runtime-backed action safety
Acceptance criteria:
1. Code lenses return deterministic command payloads.
2. Runtime-backed actions are blocked when lockfile parity requirements are unmet.
3. Lens action contracts disallow untrusted command execution.

### Story 2.3: Align CLI and LSP contract surfaces
Acceptance criteria:
1. Authoring CLI commands and LSP methods share equivalent payload and envelope contracts.
2. Local and CI diagnostics are equivalent under matching artifact/catalog hashes.
3. Authoring conformance fixtures validate CLI/LSP parity.

## Epic 3: VS Code First-Party Experience

### Story 3.1: Ship VS Code extension adapter for LSP
Acceptance criteria:
1. Extension hosts language features through typed adapter contracts.
2. Activation and feature registration are deterministic and reliable.
3. Extension does not fork semantics from core LSP contracts.

### Story 3.2: Finalize release and telemetry defaults
Acceptance criteria:
1. Initial publish path targets VS Code Marketplace first.
2. Telemetry default is opt-in for initial release.
3. Operational docs cover privacy posture and user controls.

### Story 3.3: Add cross-client readiness baseline
Acceptance criteria:
1. LSP contracts remain editor-agnostic and portable.
2. Feature behavior is validated with protocol-level fixtures.
3. Client-specific deviations are cataloged with deterministic mitigation guidance.

## Sequence Exit Criteria

1. Authoring intelligence loop is deterministic and fast.
2. VS Code surface is product-ready without semantic drift from LSP contracts.
3. CI and local authoring outputs are parity-safe.
4. Reachability and delegation authoring constraints are diagnosable in-editor and in CI.
5. Guard/invariant and scenario/persona authoring constraints are diagnosable in-editor and in CI.
