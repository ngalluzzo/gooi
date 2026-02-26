# Track 01: Runtime Foundations and Host Boundaries

## RFC Alignment

- [RFC-0001](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0001-capability-contract-and-provider-runtime-interface.md)
- [RFC-0005](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0005-host-adapter-contracts-and-runtime-boundary-hardening.md)
- [RFC-0006](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0006-marketplace-host-adapter-provider-model-and-memory-reference.md)

## Epic 1: Capability and Provider Contract Canonicalization

### Story 1.1: Finalize capability port contract boundaries
Acceptance criteria:
1. Capability IO contracts are represented in canonical typed schemas and enforced at runtime boundaries.
2. Contract parse failures return typed error envelopes, not ad hoc runtime exceptions.
3. Contract compatibility guidance is documented for additive vs breaking changes.

### Story 1.2: Finalize provider manifest and lockfile integrity baseline
Acceptance criteria:
1. Provider checksum requirements are enforced in lockfile workflows.
2. Manifest parsing/validation is deterministic for identical inputs.
3. Contract and manifest versioning behavior is documented and test-backed.

### Story 1.3: Pin host/provider schema profile
Acceptance criteria:
1. JSON Schema profile version is explicitly pinned and referenced by contract tooling.
2. Schema emission and validation paths use the same profile across CLI and CI.
3. Compatibility checks fail with typed diagnostics when schema profile mismatch occurs.

## Epic 2: Host Boundary Hardening

### Story 2.1: Enforce explicit HostPortSet contracts
Acceptance criteria:
1. Runtime orchestration consumes host functionality only through typed host ports.
2. Missing host ports fail fast with deterministic typed errors.
3. Host contract fixtures cover success and failure paths for each required host feature.

### Story 2.2: Remove ambient host globals from runtime paths
Acceptance criteria:
1. Entry/runtime codepaths no longer access ambient singleton host state.
2. Conformance tests fail if ambient global access is reintroduced.
3. Runtime wiring clearly shows host dependency injection path.

### Story 2.3: Codify module loading/integrity extension boundary
Acceptance criteria:
1. Module loading/integrity behavior is deferred behind explicit future host port extension points.
2. Current milestone contracts remain backward-compatible.
3. Future extension contract shape is documented as non-breaking additive design.

## Epic 3: Foundational Host-Provider Implementation Pattern

### Story 3.1: Provide feature-local host provider constructors
Acceptance criteria:
1. Each host feature has one explicit provider constructor surface in host contracts.
2. Constructor inputs enforce manifest + createPort shape deterministically.
3. Public exports remain feature-scoped without barrel aggregation.

### Story 3.2: Ship memory reference implementations per host feature
Acceptance criteria:
1. Memory provider exists for each core host feature and composes contract constructors.
2. Reference providers have deterministic behavior in CI fixtures.
3. Runtime and tests consume only public exports, not internal files.

### Story 3.3: Establish host/replay conformance baseline
Acceptance criteria:
1. Host aggregate and replay-store conformance suites are required in default CI.
2. Conformance reports are deterministic and include typed check identifiers.
3. Provider publication checklist references conformance artifacts as required evidence.

## Epic 4: Capability Reachability and Delegation Foundation

### Story 4.1: Add capability reachability contract primitives
Acceptance criteria:
1. Provider manifest contracts include capability execution-host compatibility metadata.
2. Binding-plan contract can classify required capabilities as `local`, `delegated`, or `unreachable`.
3. Reachability contract parsing and validation are deterministic and type-safe.

### Story 4.2: Add host delegation port boundary
Acceptance criteria:
1. `HostCapabilityDelegationPort` is part of canonical host contracts.
2. Delegated invocation accepts explicit route id plus typed capability call envelope.
3. Delegation boundary failures return typed errors (`capability_delegation_error`).

### Story 4.3: Enforce fail-hard unreachable behavior
Acceptance criteria:
1. Required capabilities marked `unreachable` fail activation/invocation deterministically.
2. Runtime does not permit implicit fallback provider behavior.
3. Error taxonomy includes `capability_unreachable_error` and is fixture-tested.

## Sequence Exit Criteria

1. Foundation contracts are canonical and deterministic.
2. Host boundaries are explicit and enforceable.
3. Foundational host-provider pattern is reusable across product lanes.
4. Reachability and delegation behavior is contract-defined and fail-safe.
