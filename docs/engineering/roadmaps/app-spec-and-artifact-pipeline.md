# Track 02: Full App Spec and Artifact Pipeline

## RFC Alignment

- [RFC-0008](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0008-full-app-spec-contract-and-canonical-compiler-model.md)
- [RFC-0013](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0013-artifact-model-v2-lane-artifacts-manifest-and-packaged-bundle.md)

## Epic 1: Full App Spec Contract Coverage

### Story 1.1: Lock complete app spec grammar and schema
Acceptance criteria:
1. All app sections required by full-platform model are represented in a single canonical schema family.
2. Unknown keys and invalid section shapes fail with deterministic diagnostics.
3. Schema versioning policy is explicit for additive and breaking changes.

### Story 1.2: Build canonical compiler internal model
Acceptance criteria:
1. Compiler transforms source spec into one canonical intermediate model prior to lane-specific emission.
2. Internal model encodes cross-section references with deterministic identifiers.
3. Compiler diagnostics include stable codes and section pointers.

### Story 1.3: Validate section cross-linking constraints
Acceptance criteria:
1. Cross-section references (routes, views, actions, projections, capabilities) are validated pre-emission.
2. Invalid links fail compilation with deterministic ordering of diagnostics.
3. CI fixtures cover valid, invalid, and ambiguous reference cases.

## Epic 2: Lane Artifacts and Manifest Canonicalization

### Story 2.1: Emit lane artifacts deterministically
Acceptance criteria:
1. Authoring/runtime/quality/marketplace consumers can read lane artifacts without bundle unpack requirement.
2. Artifact hashes are stable for identical inputs.
3. Artifact serialization order is canonical and test-backed.

### Story 2.2: Emit CompiledArtifactManifest v2 as canonical index
Acceptance criteria:
1. Manifest references all required lane artifacts with hash + version metadata.
2. Manifest validation returns typed compatibility and integrity diagnostics.
3. Manifest compatibility policy is documented and enforced in activation flows.

### Story 2.3: Add packaged bundle as optional transport format
Acceptance criteria:
1. Bundle generation/unpack preserves lane artifact semantics exactly.
2. Bundle verify flow fails on corruption or hash mismatch with typed errors.
3. Bundle remains optional and does not replace lane-artifact-first workflows.

## Epic 3: Artifact Consumption Parity Across Lanes

### Story 3.1: Runtime activation consumes manifest contracts
Acceptance criteria:
1. Runtime activation validates manifest and required artifact hashes before execution.
2. Activation mismatch failures are deterministic and reproducible.
3. Activation logs include artifact identity and mismatch diagnostics.

### Story 3.2: Authoring lockfile parity uses artifact identities
Acceptance criteria:
1. Lockfile checks compare artifact and catalog identities consistently across local and CI.
2. Mismatch handling supports degraded read-only behavior where defined.
3. Lockfile mismatch diagnostics are stable and actionable.

### Story 3.3: Trust policy handoff for signatures
Acceptance criteria:
1. Manifest signature fields remain optional at schema level.
2. Certified/production trust policies can require signatures without schema changes.
3. Policy-driven signature enforcement paths are documented and test-backed.

## Epic 4: Binding Requirements and Reachability Compilation

### Story 4.1: Compile wiring reachability requirements canonically
Acceptance criteria:
1. `wiring` compilation includes deployment reachability requirements in canonical model outputs.
2. Reachability requirement diagnostics are deterministic for invalid or ambiguous declarations.
3. Canonical language is consistent with runtime/resolver contracts (`local`/`delegated`/`unreachable`).

### Story 4.2: Emit compiled binding requirements artifact
Acceptance criteria:
1. Compiler emits `CompiledBindingRequirements` as deployment resolver input contract.
2. Artifact hashes for binding requirements are stable for identical inputs.
3. Manifest references include binding requirements artifact identity and compatibility metadata.

### Story 4.3: Validate cross-section reachability references
Acceptance criteria:
1. Capability reachability requirements reference valid capability ids/versions.
2. Invalid reachability references fail compile before artifact emission.
3. Fixture matrix covers valid local, valid delegated, and unreachable declaration cases.

## Sequence Exit Criteria

1. Full app specs compile through one canonical model.
2. Lane artifacts + manifest are deterministic and consumable across lanes.
3. Artifact integrity policy is enforceable at runtime and authoring boundaries.
4. Binding requirements are canonical artifacts consumable by resolver and runtime.
