# Track 03: Runtime Kernel, Domain, Projections, and Guards

## RFC Alignment

- [RFC-0002](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0002-entrypoint-execution-pipeline.md)
- [RFC-0009](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0009-domain-runtime-semantics-actions-capabilities-flows-and-session-outcomes.md)
- [RFC-0010](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0010-projection-runtime-semantics-join-aggregate-timeline-and-history.md)
- [RFC-0019](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0019-guard-and-invariant-runtime-contracts.md)
- [RFC-0020](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0020-scenario-runtime-and-persona-simulation-contracts.md)
- [RFC-0022](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0022-kernel-runtime-core-and-standalone-adoption.md)
- [RFC-0023](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0023-runtime-semantics-recomposition-and-runtime-package-reset.md)

## Rebaseline: RFC-0022 and RFC-0023

This track is re-baselined to frontload kernel ownership and runtime recomposition
before Track 04 is considered fully unblocked.

### Epic 5: Kernel Product Lane Foundation (RFC-0022)

#### Story 5.1: Scaffold kernel product lane and canonical API surface
Acceptance criteria:
1. `products/kernel/*` package scaffolds exist with explicit ownership and `exports`.
2. Kernel entrypoint contracts expose one factory path and typed invoke/trace surfaces.
3. Runtime and surface packages compile against kernel API skeletons without direct orchestration imports.

#### Story 5.2: Implement kernel host-bridge and portset validation
Acceptance criteria:
1. Host-port normalization and validation is centralized in kernel host bridge modules.
2. Invalid host-portset inputs fail with typed deterministic errors.
3. Standalone kernel consumers can invoke baseline fixtures using only compiled artifacts + portset.

#### Story 5.3: Enforce kernel as canonical execution core
Acceptance criteria:
1. Query/mutation orchestration paths execute through kernel-owned entrypoints only.
2. Runtime and surface packages do not retain lane-local orchestration fallbacks.
3. Lint-enforced boundary rules and ownership docs make non-kernel orchestration reintroduction explicit and review-blocking.

#### Story 5.4: Document Track 04 readiness under quality ownership
Acceptance criteria:
1. Track 04 readiness checklist references concrete kernel completion artifacts.
2. Track 04 readiness is captured in docs with a concrete checklist and artifact pointers.
3. Readiness is reviewed in architecture sync and recorded before Track 04 implementation begins.

### Epic 6: Runtime Recomposition and Package Reset (RFC-0023)

#### Story 6.1: Define canonical execution spine contract and runtime dependency map
Acceptance criteria:
1. One execution-spine contract defines orchestration order across query and mutation paths.
2. Runtime package dependency map distinguishes orchestration ownership from semantic engine ownership.
3. Legacy orchestration paths are inventory-listed with explicit deletion owners.
Artifacts:
1. [/Users/ngalluzzo/repos/gooi/docs/engineering/runtime/execution-spine-contract-and-dependency-map.md](/Users/ngalluzzo/repos/gooi/docs/engineering/runtime/execution-spine-contract-and-dependency-map.md)

#### Story 6.2: Route query/mutation execution through kernel spine
Acceptance criteria:
1. Query and mutation flows traverse kernel orchestration before semantic engine execution.
2. Access policy, replay checks, and envelope emission no longer run in lane-local duplicate paths.
3. End-to-end conformance fixtures are green against canonical kernel behavior.
Artifacts:
1. [/Users/ngalluzzo/repos/gooi/products/kernel/execution-kernel/src/entrypoint-spine.ts](/Users/ngalluzzo/repos/gooi/products/kernel/execution-kernel/src/entrypoint-spine.ts)
2. [/Users/ngalluzzo/repos/gooi/products/runtime/entrypoint-runtime/src/execution/run-entrypoint.ts](/Users/ngalluzzo/repos/gooi/products/runtime/entrypoint-runtime/src/execution/run-entrypoint.ts)

#### Story 6.3: Extract domain runtime into semantic-engine-only ownership
Acceptance criteria:
1. Domain runtime keeps action/flow/session semantics but no orchestration policy sequencing.
2. Domain runtime exports consumed by kernel are explicit and minimal.
3. Domain runtime tests prove semantic conformance after orchestration extraction.

#### Story 6.4: Extract projection runtime into semantic-engine-only ownership
Acceptance criteria:
1. Projection runtime keeps join/aggregate/timeline semantics but no orchestration policy sequencing.
2. Projection runtime query outputs are produced through kernel-owned envelope shaping.
3. Projection conformance and determinism fixtures are green post-extraction.

#### Story 6.5: Extract guard runtime into semantic-engine-only ownership
Acceptance criteria:
1. Guard runtime keeps invariant/guard evaluation semantics but no orchestration policy sequencing.
2. Guard diagnostics/signals are emitted through canonical kernel execution paths.
3. Guard conformance fixtures are green post-extraction.

#### Story 6.6: Delete legacy runtime orchestration paths and harden boundaries
Acceptance criteria:
1. Legacy runtime orchestration modules are deleted (not retained as long-lived compatibility aliases).
2. Lint boundary rules and import-layer constraints flag orchestration logic introduced outside kernel ownership.
3. Runtime ownership docs and package exports reflect final post-reset architecture.

## Issue Mapping (RFC-0022/RFC-0023 Slice)

1. Story 5.1: [#162](https://github.com/ngalluzzo/gooi/issues/162)
2. Story 5.2: [#163](https://github.com/ngalluzzo/gooi/issues/163)
3. Story 5.3: issue pending (kernel boundary enforcement)
4. Story 5.4: issue pending (quality-owned Track 04 readiness checklist)
5. Story 6.1: [#166](https://github.com/ngalluzzo/gooi/issues/166)
6. Story 6.2: [#167](https://github.com/ngalluzzo/gooi/issues/167)
7. Story 6.3: [#168](https://github.com/ngalluzzo/gooi/issues/168)
8. Story 6.4: [#169](https://github.com/ngalluzzo/gooi/issues/169)
9. Story 6.5: [#170](https://github.com/ngalluzzo/gooi/issues/170)
10. Story 6.6: [#171](https://github.com/ngalluzzo/gooi/issues/171)

## Epic 1: Entrypoint Runtime Core Semantics

### Story 1.1: Enforce canonical execution pipeline
Acceptance criteria:
1. Execution order is deterministic from input bind through validation, policy, and runtime invocation.
2. Query and mutation envelopes are typed and versioned.
3. Pipeline behavior is consistent across supported surfaces.

### Story 1.2: Mutation replay and idempotency guarantees
Acceptance criteria:
1. Mutation idempotency keys are enforced with deterministic replay outcomes.
2. Replay conflict paths emit typed conflict diagnostics.
3. Replay-store contract integration is test-backed.

### Story 1.3: Signal emission and refresh invalidation contract
Acceptance criteria:
1. Mutation outcomes emit canonical signal invalidation payloads.
2. Refresh consumers can subscribe and resolve invalidations deterministically.
3. End-to-end fixtures verify write-to-refresh correctness.

### Story 1.4: Capability reachability execution semantics
Acceptance criteria:
1. Entrypoint/provider runtime resolves capability calls deterministically: `local` -> `delegated` -> `capability_unreachable_error`.
2. Delegated execution path uses explicit route metadata from deployment artifacts.
3. Runtime never applies implicit fallback provider behavior.

## Epic 2: Domain Runtime Semantics (Actions, Capabilities, Flows)

### Story 2.1: Action/capability flow semantics
Acceptance criteria:
1. Action step execution semantics are deterministic for defaults, nulls, and unknown keys.
2. Capability invocation contracts are validated before side effects.
3. Domain runtime errors use typed taxonomy with stable codes.

### Story 2.2: Session outcomes and policy ordering
Acceptance criteria:
1. Principal and access policy evaluation order is explicit and deterministic.
2. Session outcomes include typed success/failure envelopes.
3. Policy failures are consistent across surface transports.

### Story 2.3: Domain simulation and traceability
Acceptance criteria:
1. Simulation mode can execute deterministic domain paths without hidden side effects.
2. Runtime traces include action/capability step identifiers.
3. Simulation outputs are comparable against live-run envelopes.

### Story 2.4: Capability portability invariants
Acceptance criteria:
1. Domain logic behaves equivalently when capability binding moves between execution hosts (for example browser/wasm to node).
2. Portability scenarios are fixture-tested without domain spec rewrites.
3. Domain runtime traces include explicit reachability mode (`local` or `delegated`).

## Epic 3: Projection Runtime Semantics

### Story 3.1: Join and aggregate execution model
Acceptance criteria:
1. Projection join/aggregate behavior is deterministic for ordering and tie handling.
2. Projection strategy selection is explicit and type-safe.
3. Projection failures return typed diagnostics with source references.

### Story 3.2: Timeline and history semantics
Acceptance criteria:
1. Timeline outputs preserve deterministic ordering across identical inputs.
2. History windows and pagination semantics are stable.
3. Timeline artifacts remain compatible with query and view consumers.

### Story 3.3: Projection-domain conformance checks
Acceptance criteria:
1. Projection refresh behavior matches emitted domain invalidation contracts.
2. Projection outputs are conformance-tested against domain mutation fixtures.
3. Regression fixtures cover stale read, conflict, and replay-adjacent edge cases.

### Story 3.4: History provider operation contract enforcement
Acceptance criteria:
1. Timeline runtime enforces typed history operation contracts (`append`, `scan`, optional `scan_as_of`, `rebuild`, `persist`).
2. Time-travel queries fail fast when required capabilities are absent.
3. Duplicate event keys are handled idempotently and deterministically.

### Story 3.5: Timeline accumulation drift gate
Acceptance criteria:
1. Timeline accumulation hash drift is detected against deployment lockfile state.
2. Stale accumulation state is blocked with typed rebuild-required errors.
3. Explicit rebuild workflows restore queryability with deterministic metadata.

### Story 3.6: Signal migration-chain replay semantics
Acceptance criteria:
1. Timeline replay applies cumulative signal migration chains before handler evaluation.
2. Missing migration-chain segments fail compile/runtime activation with typed diagnostics.
3. Migration fixtures cover additive, breaking, and type-change payload evolution cases.

## Epic 4: Guard, Invariant, and Scenario Runtime Contracts

### Story 4.1: Enforce layered guard and invariant matrix
Acceptance criteria:
1. Collection, action, signal, flow, and projection guard/invariant behavior is enforced per canonical runtime boundary.
2. Structural vs semantic guard ordering and failure policies are deterministic.
3. Guard violations emit typed diagnostics/signals according to policy contracts.

### Story 4.2: Implement semantic judge contract behavior
Acceptance criteria:
1. Semantic judge invocation follows confidence and sampling policies by environment.
2. Missing semantic judge bindings degrade per contract rules without affecting structural guard enforcement.
3. Semantic guard confidence-tier behavior is fixture-tested and deterministic.

### Story 4.3: Execute scenarios/personas against canonical runtime
Acceptance criteria:
1. Scenario runtime executes `trigger`/`expect`/`capture` semantics against canonical entrypoint/domain/projection lanes.
2. Persona-driven generation is lockfile-backed and deterministic by default.
3. Scenario failures return typed scenario/guard diagnostics with step-level traceability.

## Sequence Exit Criteria

1. Runtime kernel semantics are deterministic and typed.
2. Domain and projection runtimes interoperate under one contract model.
3. Replay, policy, and invalidation guarantees are proven in fixtures.
4. Mixed-host capability execution is deterministic and portability-safe.
5. Timeline history/time-travel/rebuild/migration contracts are fully enforced.
6. Guard/invariant and scenario/persona runtime contracts are fully enforced.
