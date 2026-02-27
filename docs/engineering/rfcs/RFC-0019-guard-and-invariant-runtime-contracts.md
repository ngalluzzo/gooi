# RFC-0019: Guard and Invariant Runtime Contracts

## Metadata

- RFC: `RFC-0019`
- Title: `Guard and Invariant Runtime Contracts`
- Status: `Proposed`
- Owners: `Runtime Platform`, `Product Platform`
- Reviewers: `Developer Experience`, `Quality`, `Marketplace`
- Created: `2026-02-26`
- Updated: `2026-02-26`
- Target release: `Runtime Milestone R3`
- Related:
  - Spec source: [demo.yml](/Users/ngalluzzo/repos/gooi/docs/demo.yml)
  - Full spec model: [RFC-0008-full-app-spec-contract-and-canonical-compiler-model.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0008-full-app-spec-contract-and-canonical-compiler-model.md)
  - Domain runtime: [RFC-0009-domain-runtime-semantics-actions-capabilities-flows-and-session-outcomes.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0009-domain-runtime-semantics-actions-capabilities-flows-and-session-outcomes.md)
  - Projection runtime: [RFC-0010-projection-runtime-semantics-join-aggregate-timeline-and-history.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0010-projection-runtime-semantics-join-aggregate-timeline-and-history.md)
  - Conformance: [RFC-0015-cross-lane-conformance-expansion-l0-l3-parity-and-determinism-gates.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0015-cross-lane-conformance-expansion-l0-l3-parity-and-determinism-gates.md)

## Problem and context

The spec currently authors collection invariants and multiple guard families, but
runtime policy for all guard types is not yet one explicit contract.

Product gap:

1. Enforcement points and available tiers differ by primitive but are not fully standardized.
2. Failure policies are authored but not formalized as a cross-primitive contract.
3. Semantic guard behavior (confidence/sampling/judge availability) is not canonicalized.

Without this RFC, behavior can drift across runtime paths and providers.

## Goals

1. Define one canonical layered enforcement model for invariants and guards.
2. Define primitive-specific contract rules for collection/action/signal/flow/projection guards.
3. Define canonical guard failure policy behavior.
4. Define semantic guard confidence and sampling behavior by environment.
5. Define deterministic guard diagnostics and envelopes across runtime paths.

## Non-goals

1. Defining full scenario execution model (covered by RFC-0020).
2. Defining non-technical authoring UI.
3. Defining provider recommendation/ranking logic.
4. Replacing existing domain/projection runtime RFC ownership boundaries.

## Product outcomes and success metrics

Outcomes:

1. Authors can predict where each guard executes and what it can evaluate.
2. Guard policy behavior is deterministic and portable across surfaces.
3. Semantic guard cost and reliability behavior is explicit and testable.

Metrics:

- Product metric(s):
  - `100%` guard-enabled primitives execute through declared enforcement points.
  - `100%` collection writes evaluate collection invariants regardless of triggering entrypoint.
- Reliability metric(s):
  - `0` accepted writes that violate declared `on_fail: abort` collection invariants.
  - `100%` guard failures produce typed diagnostics and policy outcomes.
- Developer experience metric(s):
  - Guard failure diagnostics include primitive id, tier, and guard description `100%`.
  - Conformance fixtures cover all guard policy outcomes for each supported primitive.
- Explicit latency/availability target(s) with numeric thresholds:
  - Structural guard evaluation overhead p95 `< 5ms` per primitive execution.
  - Semantic guard orchestration overhead p95 `< 20ms` excluding judge provider latency.

## Proposal

Define canonical layered enforcement points with primitive-specific tier support.

### Layered enforcement model

| Layer | Owner | Tiers available | Enforcement point |
|---|---|---|---|
| Collection invariants | Data model / engineering | Structural only | Every write, any entrypoint |
| Action guards | Engineering / domain | Structural + semantic | Action execution (`pre` and `post`) |
| Signal guards | Domain experts / CS / PMM | Structural + semantic | Signal emission after write path, before dispatch |
| Flow guards | Engineering | Structural + semantic | Flow outcome evaluation |
| Projection guards | Engineering | Structural only | Read-time result validation (per row) |

### Guard tier model

1. Structural tier:
   - JSONLogic-like deterministic expressions.
   - evaluated first.
2. Semantic tier:
   - natural-language criteria evaluated by semantic judge capability.
   - evaluated only if structural tier passes.

### Primitive contracts

1. Collection invariants:
   - structural-only.
   - evaluated for all `collections.write` operations (`upsert`, `update`, `delete`) before commit.
2. Action guards:
   - `pre` tier executes before first `do` step.
   - `post` tier executes after step graph completion before result finalization.
3. Signal guards:
   - executes after action write path and before signal dispatch to flow/invalidation consumers.
4. Flow guards:
   - executes after step graph and before final flow outcome envelope is committed.
5. Projection guards:
   - structural-only row validation in projection runtime response assembly.

### Guard failure policies

Supported policies:

1. `abort`:
   - halt current primitive path and return typed error envelope.
2. `fail_action`:
   - action-scoped alias to `abort`.
3. `log_and_continue`:
   - emit diagnostics event and continue normal path.
4. `emit_violation`:
   - emit `guard.violated` system signal and continue normal path unless primitive contract disallows continue.

### System signal contract

`guard.violated` payload includes:

1. primitive kind and primitive id.
2. guard tier and description.
3. policy applied.
4. deterministic context snapshot reference.

### Semantic confidence and CI behavior

1. `high`:
   - 3 judge invocations (majority vote), fails CI on majority failure.
2. `medium`:
   - 1 judge invocation, fails CI on failure.
3. `low`:
   - 1 judge invocation, warn-only in CI.

### Sampling model

1. Structural tier always runs at `100%`.
2. Semantic tier uses environment-aware sampling (`production`, `simulation`, `ci`).
3. `simulation` and `ci` default to `1.0` unless explicitly overridden.

### Semantic judge provider contract

1. Semantic tier depends on bound capability `guards.semantic.evaluate`.
2. If no judge is bound:
   - structural tier still runs.
   - semantic tier behavior follows environment policy (warning or failure policy per configured strictness).

### Deterministic runtime behavior rules

- Input normalization order:
  - compile-bound input -> structural tier -> semantic tier -> policy application.
- Default precedence:
  - explicit primitive guard config > runtime defaults.
- Unknown/null handling:
  - unknown guard config keys fail compile.
  - `null` evaluation follows compiled scalar contracts.
- Stable ordering requirements:
  - guard evaluation follows authored order within each tier.
  - violation diagnostics are stable-sorted by primitive -> tier -> description.
- Idempotency/replay behavior (for write paths):
  - guard outcomes are included in replay-safe result envelopes for deterministic re-evaluation decisions.

## Ubiquitous language

1. `Collection invariant`: structural write constraint on a collection.
2. `Guard tier`: structural or semantic evaluation layer.
3. `Guard policy`: configured on-failure behavior.
4. `Violation signal`: system signal emitted when policy requires eventing.
5. `Semantic judge`: bound capability that evaluates semantic criteria.

## Boundaries and ownership

- Surface adapters:
  - no ownership of guard semantics.
- Kernel/domain runtime:
  - owns action/signal/flow guard enforcement integration.
- Projection runtime:
  - owns projection-guard enforcement on read paths.
- Capability adapters:
  - may provide semantic judge capability, no ownership of guard policy semantics.
- Host/platform adapters:
  - own observability/event transport for violation events.

Must-not-cross constraints:

1. Adapters/providers must not redefine guard policy semantics.
2. Surface transports must not bypass invariant/guard enforcement.
3. Semantic judge outputs must not mutate structural-tier outcomes.

## Contracts and typing

- Boundary schema authority:
  - Zod contracts for guard configs, outcomes, and diagnostics envelopes.
- Authoring format:
  - guard and invariant declarations in canonical app spec sections.
- Generated runtime artifact format:
  - `CompiledGuardPolicyPlan@1.0.0`.
- Canonical compiled artifact schema (required):
  - `CompiledGuardDefinition`
  - `CompiledInvariantDefinition`
  - `CompiledGuardPolicyPlan`
- Artifact version field and hash policy:
  - guard plan includes section hash and aggregate artifact reference hash.
- Deterministic serialization rules:
  - stable rule ordering and deterministic payload field ordering.
- Allowed/disallowed schema features:
  - disallow unknown policy names and unsupported tier declarations by primitive.
- Public contract shape:
  - `evaluateGuard(input) -> GuardEvaluationResult`
  - `evaluateInvariant(input) -> InvariantEvaluationResult`
- Invocation/result/error/signal/diagnostics envelope schemas:
  - `GuardEvaluationEnvelope@1.0.0`
  - `InvariantEvaluationEnvelope@1.0.0`
  - `GuardViolationSignalEnvelope@1.0.0`
- Envelope versioning strategy:
  - semver literal `1.0.0` initial.
- Principal/auth context schema:
  - semantic tier may consume principal/persona context if present in compiled context contract.
- Access evaluation order:
  - unchanged from entrypoint runtime; guards run after access has passed.
- Error taxonomy:
  - `collection_invariant_error`
  - `action_guard_error`
  - `signal_guard_error`
  - `flow_guard_error`
  - `projection_guard_error`
  - `semantic_guard_unavailable_error`
  - `guard_policy_error`
- Compatibility policy:
  - guard plan breaking changes require major version.
- Deprecation policy:
  - policy/tier field deprecations require replacement metadata and migration diagnostics.

## API and module plan

Feature-oriented module layout:

1. `products/runtime/guard-runtime`
   - `src/invariants/*`
   - `src/action-guards/*`
   - `src/signal-guards/*`
   - `src/flow-guards/*`
   - `src/projection-guards/*`
   - `src/policies/*`
2. `products/contracts/guard-contracts`
   - guard/invariant schemas, envelopes, and error contracts.

Public APIs via `package.json` exports:

1. `@gooi/guard-runtime/{evaluate,policies}`
2. `@gooi/guard-contracts/{plans,envelopes,errors,signals}`

No barrel files:

1. explicit subpath exports only.

Single entry per feature:

1. one invariant evaluation entrypoint.
2. one guard evaluation entrypoint with primitive kind routing.

## Package boundary classification

- Proposed location(s):
  - `products/runtime/guard-runtime`
  - `products/contracts/guard-contracts`
- Lane (if `products/*`):
  - `runtime`
- Why this boundary is correct:
  - runtime owns enforcement behavior; contracts remain reusable across runtime and quality lanes.
- Primary consumers (internal/external):
  - domain runtime, projection runtime, conformance suite, advanced embedded adopters.
- Coupling expectations:
  - depends on compiled plan contracts and typed judge capability interfaces.
  - must not depend on surface-specific code or marketplace internals.
- Why this is not a better fit in another boundary:
  - embedding inside one runtime module would blur action/signal/projection responsibilities.
- Promotion/demotion plan:
  - stable contracts may expand for external SDK use after runtime semantics stabilize.

## Delivery plan and rollout

Phase 1: contracts and policy matrix

- Entry criteria:
  - RFC approved.
- Exit criteria:
  - guard/invariant contracts and policy behavior schema published.
- Deliverables:
  - `@gooi/guard-contracts` baseline.

Phase 2: runtime enforcement integration

- Entry criteria:
  - Phase 1 complete.
- Exit criteria:
  - action/signal/flow/projection/collection enforcement implemented in runtime lanes.
- Deliverables:
  - guard-runtime module and integrations.

Phase 3: semantic and conformance hardening

- Entry criteria:
  - Phase 2 complete.
- Exit criteria:
  - semantic confidence/sampling behavior and conformance fixtures are release-gated.
- Deliverables:
  - full conformance matrix and operational diagnostics.

## Test strategy and acceptance criteria

1. Unit:
   - tier evaluation order, policy application, error taxonomy mapping.
2. Integration:
   - write/action/signal/flow/read paths with guard outcomes.
3. Golden:
   - deterministic guard violation envelopes and signal payloads.
4. Conformance:
   - cross-lane parity for invariant/guard outcomes.
5. Fault tests:
   - judge unavailable, malformed config, policy conflicts, retry/replay re-entry.

Definition of done:

1. all declared invariant/guard primitives execute through canonical enforcement points.
2. policy outcomes are deterministic and typed.
3. semantic tier behavior is explicitly test-backed by environment profile.

## Operational readiness

1. Observability:
   - guard pass/fail counters, policy application counts, semantic invocation rates.
2. Failure handling:
   - typed guard failure paths and fallback behavior.
3. Security requirements:
   - semantic judge input/output redaction policy for sensitive fields.
4. Runbooks:
   - guard policy incident triage, semantic judge outage handling.
5. Alert thresholds:
   - unexpected semantic judge unavailable rate > `1%` over 15m.
   - invariant abort failures > `0.5%` of writes over 15m.

## Risks and mitigations

1. Risk: Semantic tier cost spikes in production.
   - Mitigation: environment sampling and strict structural pre-filtering.
2. Risk: Policy misuse causes silent quality regressions.
   - Mitigation: conformance gates and policy lint diagnostics.
3. Risk: Provider divergence in enforcement behavior.
   - Mitigation: cross-lane conformance suites and deterministic envelope checks.

## Alternatives considered

1. Keep guard semantics implicit in each runtime module.
   - Rejected: guarantees drift and weak policy portability.
2. Structural-only guard model.
   - Rejected: cannot encode authored semantic outcomes present in spec.
3. Semantic-only guard model.
   - Rejected: costly and weak for deterministic low-latency invariants.

## Open questions

None.

## Decision log

- `2026-02-26` - Established one canonical layered enforcement model for collection invariants and guard families.
- `2026-02-26` - Established structural-first semantic-second tier evaluation as canonical behavior.
- `2026-02-26` - Resolved judge-unavailable policy: semantic guard evaluation without a judge binding fails hard in `ci` by default.
- `2026-02-26` - Resolved projection-guard policy: projection guards support `emit_violation` in `1.0.0`.
- `2026-02-26` - Resolved cross-collection invariants scope: defer to a dedicated referential-integrity contract RFC.
