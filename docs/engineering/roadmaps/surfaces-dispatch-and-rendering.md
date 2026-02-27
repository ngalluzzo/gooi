# Track 04: Surfaces, Dispatch, and Rendering

## RFC Alignment

- [RFC-0011](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0011-route-and-surface-dispatch-contracts-web-http-cli-and-webhook.md)
- [RFC-0012](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0012-view-render-ir-and-renderer-adapter-contract.md)
- [RFC-0022](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0022-kernel-runtime-core-and-standalone-adoption.md)
- [RFC-0023](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0023-runtime-semantics-recomposition-and-runtime-package-reset.md)

## Entry Gate (Pre-Track)

Track 04 implementation is blocked until:
1. RFC-0022 kernel preconditions are accepted and kernel boundary/API scaffolding is in place.
2. RFC-0023 execution-spine contract and kernel-routed query/mutation cutover (Phase 2 equivalent) are complete.

## Epic 1: Route and Surface Dispatch Contracts

### Story 1.1: Canonical route matching and dispatch model
Acceptance criteria:
1. Route matching behavior is deterministic for overlapping and ambiguous patterns.
2. Dispatch resolves to canonical entrypoint references with typed payload binding.
3. Dispatch mismatch errors use stable, typed diagnostics.

### Story 1.2: Multi-surface transport parity
Acceptance criteria:
1. Web, HTTP, CLI, and webhook surfaces map to shared dispatch contracts.
2. Transport-specific adapters do not mutate semantic intent.
3. Conformance fixtures prove parity for equivalent invocations across surfaces.

### Story 1.3: Surface policy and auth boundary enforcement
Acceptance criteria:
1. Surface adapters pass principal/auth context through canonical contracts.
2. Access and policy decisions remain runtime-owned, not adapter-owned.
3. Unauthorized and malformed dispatch cases return deterministic typed envelopes.

### Story 1.4: Surface and host context propagation
Acceptance criteria:
1. Dispatch outputs include canonical `surfaceId` and `invocationHost` context for downstream reachability decisions.
2. Dispatch runtime does not select providers or delegation routes.
3. Context propagation is deterministic across web/http/cli/webhook adapters.

## Epic 2: View Render IR Canonicalization

### Story 2.1: Compile views to stable Render IR
Acceptance criteria:
1. View definitions compile into deterministic IR nodes and identifiers.
2. IR serialization is stable for equivalent source inputs.
3. Compile errors point to original authoring locations with typed codes.

### Story 2.2: Renderer adapter contract hardening
Acceptance criteria:
1. Renderer adapters consume canonical IR without requiring runtime internals.
2. Adapter capability mismatches produce typed compatibility diagnostics.
3. Adapter conformance fixtures include supported/unsupported component paths.

### Story 2.3: UI signal/refresh integration in render lifecycle
Acceptance criteria:
1. Render refresh semantics consume canonical invalidation signals.
2. Refresh ordering is deterministic under concurrent invalidations.
3. UI artifacts preserve parity with runtime and projection outputs.

## Epic 3: End-to-End Surface-to-Render Semantics

### Story 3.1: Dispatch-to-render pipeline verification
Acceptance criteria:
1. End-to-end fixtures validate route dispatch through runtime to rendered output.
2. Error pathways preserve typed envelopes from dispatch through render adapters.
3. Repeated equivalent requests produce equivalent rendered outputs.

### Story 3.2: Surface fallback and resilience behavior
Acceptance criteria:
1. Unsupported surface features degrade with explicit diagnostics, not silent behavior.
2. Retry/replay interactions across dispatch and render remain deterministic.
3. Operational runbooks cover dispatch and render failure classes.

### Story 3.3: Surface extension readiness
Acceptance criteria:
1. Adding a new surface requires adapter work only, not runtime semantic changes.
2. Extension contract checklist is documented and test-backed.
3. New-surface conformance template is available and reusable.

## Sequence Exit Criteria

1. Dispatch semantics are canonical across supported surfaces.
2. Render IR is stable and adapter-safe.
3. End-to-end surface-to-render behavior is deterministic and test-backed.
4. Dispatch/runtime ownership boundary for capability reachability is explicit and enforced.
