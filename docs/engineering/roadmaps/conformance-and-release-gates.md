# Track 08: Conformance and Release Gates

## RFC Alignment

- [RFC-0015](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0015-cross-lane-conformance-expansion-l0-l3-parity-and-determinism-gates.md)
- [RFC-0007](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0007-north-star-platform-shape-and-progressive-dx-api.md)

## Epic 1: Conformance Contract and Harness Expansion

### Story 1.1: Finalize conformance fixture/report contracts
Acceptance criteria:
1. Fixture, check result, and report contracts are versioned and deterministic.
2. Report serialization is stable and comparable across CI runs.
3. Contract changes require explicit compatibility handling.

### Story 1.2: Build lane-aware harness execution model
Acceptance criteria:
1. Harness can execute L0/L1/L2/L3 fixture variants under one run.
2. Lane failures include deterministic lane/check identifiers.
3. Harness behavior is reproducible for pinned fixture and artifact hashes.

### Story 1.3: Build golden governance mechanism
Acceptance criteria:
1. Golden updates require explicit approval and contract/version justification.
2. Golden drift detection blocks release when unexplained.
3. Golden update workflow is documented and auditable.

## Epic 2: Progressive Parity and Determinism Gates

### Story 2.1: Enforce progressive parity gates in CI
Acceptance criteria:
1. Parity fixtures compare behavior across progressive modes.
2. Semantic divergence blocks release candidate promotion.
3. Parity failures include actionable typed diff reports.

### Story 2.2: Enforce deterministic artifact/envelope checks
Acceptance criteria:
1. Repeated identical inputs produce identical artifacts and envelopes.
2. Determinism violations are reported with typed error taxonomy.
3. Determinism gates are mandatory for release paths.

### Story 2.3: Add tiered conformance execution strategy
Acceptance criteria:
1. Smoke, full, and expanded suites exist with explicit gate roles.
2. Required gate definitions are centrally owned and versioned.
3. Suite runtime and flaky-rate thresholds are observable and enforced.

### Story 2.4: Add reachability parity gate
Acceptance criteria:
1. `runReachabilityParitySuite` verifies semantic parity between local and delegated capability execution paths.
2. Reachability parity regressions block release candidate promotion.
3. Reachability parity failures emit typed `conformance_reachability_parity_error` diagnostics.

### Story 2.5: Add guard and scenario contract parity gate
Acceptance criteria:
1. Conformance suites verify guard/invariant policy behavior parity across supported runtime modes.
2. Scenario/persona execution outputs are deterministic and parity-checked across lanes.
3. Guard/scenario parity regressions block release candidate promotion with typed diagnostics.

## Epic 3: Marketplace Conformance Integration

### Story 3.1: Add marketplace control-plane conformance suite
Acceptance criteria:
1. Control-plane listing/catalog/certification contract behavior is validated.
2. Contract regressions block release for marketplace product surfaces.
3. Conformance reports are consumable by marketplace governance workflows.

### Story 3.2: Add marketplace resolution conformance suite
Acceptance criteria:
1. Resolution outputs are deterministic and explainability contracts are enforced.
2. Policy and scoring profile behavior is fixture-tested.
3. Resolution regressions block promotion workflows.
4. Reachability mode and delegated-route metadata contracts are fixture-tested.

### Story 3.3: Add marketplace trust and revocation conformance suite
Acceptance criteria:
1. Trust verification and certification coupling are validated via fixtures.
2. Revocation propagation fail-closed behavior is validated.
3. Trust/revocation regressions block certified release paths.

## Sequence Exit Criteria

1. Cross-lane conformance gates are release-blocking and deterministic.
2. Progressive adoption parity is continuously verified.
3. Marketplace conformance is integrated into publication and promotion workflows.
4. Local/delegated execution parity is continuously verified for mixed-host fixtures.
5. Guard/invariant and scenario/persona parity is continuously verified across progressive modes.
