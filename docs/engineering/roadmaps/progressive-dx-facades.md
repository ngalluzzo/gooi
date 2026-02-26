# Track 06: Progressive DX Facades

## RFC Alignment

- [RFC-0014](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0014-progressive-dx-facade-apis-and-compatibility-guarantees.md)
- [RFC-0007](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0007-north-star-platform-shape-and-progressive-dx-api.md)

## Epic 1: Declarative Facade (`@gooi/app`)

### Story 1.1: Define canonical app facade contracts
Acceptance criteria:
1. `defineApp` and `compileApp` provide typed contract-stable interfaces.
2. Facade behavior is semantically equivalent to underlying compile primitives.
3. Facade validation errors are explicit and deterministic.

### Story 1.2: Preserve escape-hatch path to low-level APIs
Acceptance criteria:
1. Facades do not obscure or block direct lower-level package usage.
2. Documentation maps each facade operation to underlying primitives.
3. Parity tests compare facade outputs to low-level baseline outputs.

### Story 1.3: Establish facade compatibility policy
Acceptance criteria:
1. Facade semver policy is defined and enforced.
2. Deprecation paths include migration guidance and codemod strategy.
3. CI includes facade compatibility and break-detection checks.

## Epic 2: Execution and Testing Facades (`@gooi/app-runtime`, `@gooi/app-testing`)

### Story 2.1: Provide runtime composition helper facade
Acceptance criteria:
1. `createAppRuntime` composes runtime packages without semantic mutation.
2. Runtime helper overhead stays bounded and observable.
3. Runtime helper failures preserve canonical typed runtime errors.

### Story 2.2: Provide testing facade over conformance primitives
Acceptance criteria:
1. Scenario and fixture helpers are thin wrappers over conformance/runtime contracts.
2. Test facade outputs remain deterministic and comparable to base harness outputs.
3. Testing facade does not introduce an independent assertion dialect.

### Story 2.3: Validate migration flow across progressive modes
Acceptance criteria:
1. Fixtures demonstrate migration from L0/L1 to L2/L3 without rewrites.
2. Facade and low-level paths produce equivalent artifacts/envelopes.
3. Migration docs include explicit before/after API mappings.

### Story 2.4: Expose reachability-aware runtime composition
Acceptance criteria:
1. Runtime facade helpers surface typed reachability outcomes (`local`/`delegated`/`unreachable`) without changing underlying semantics.
2. Facade does not hide delegated-route requirements sourced from deployment artifacts.
3. Facade failure pathways preserve canonical error taxonomy for reachability/delegation.

## Epic 3: Marketplace-Aware Facade (`@gooi/app-marketplace`)

### Story 3.1: Add provider discovery facade contracts
Acceptance criteria:
1. Discovery APIs wrap marketplace contracts without adding hidden behavior.
2. Discovery results include compatibility and trust metadata needed for selection.
3. Discovery parity tests validate facade vs raw contract responses.

### Story 3.2: Add eligibility and trusted resolution facade contracts
Acceptance criteria:
1. Eligibility and resolution APIs expose explainable deterministic outputs.
2. Trust/certification constraints are represented in typed facade results.
3. Failure cases preserve canonical marketplace error taxonomy.

### Story 3.3: Include delegation route metadata in marketplace facade responses
Acceptance criteria:
1. Marketplace facade returns resolver reachability mode and delegated-route descriptors when present.
2. Facade output parity is maintained against raw resolver contracts.
3. Missing delegation data in delegated mode is treated as typed contract failure.

### Story 3.4: Maintain cross-facade coherence
Acceptance criteria:
1. `@gooi/app`, `@gooi/app-runtime`, and `@gooi/app-marketplace` compose without semantic conflict.
2. Package exports remain explicit and feature-scoped.
3. Cross-facade integration fixtures validate end-to-end developer flows.

## Sequence Exit Criteria

1. Progressive facades are thin, explicit, and parity-safe.
2. Developers can adopt incrementally without runtime lock-in.
3. Marketplace-aware DX is available without forcing full platform adoption.
4. Facade layer preserves mixed-host portability semantics end to end.
