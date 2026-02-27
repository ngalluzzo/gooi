# RFC-0023: Runtime Semantics Recomposition and Runtime Package Reset

## Metadata

- RFC: `RFC-0023`
- Title: `Runtime Semantics Recomposition and Runtime Package Reset`
- Status: `Draft`
- Owners: `Runtime Platform`, `Kernel Platform`
- Reviewers: `Quality Platform`, `Developer Experience`, `Marketplace Platform`
- Created: `2026-02-27`
- Updated: `2026-02-27`
- Target release: `Post-RFC-0021 Stabilization / Pre-Track-04 Completion`
- Related:
  - North star: [RFC-0007-north-star-platform-shape-and-progressive-dx-api.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0007-north-star-platform-shape-and-progressive-dx-api.md)
  - Entrypoint runtime: [RFC-0002-entrypoint-execution-pipeline.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0002-entrypoint-execution-pipeline.md)
  - Domain runtime semantics: [RFC-0009-domain-runtime-semantics-actions-capabilities-flows-and-session-outcomes.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0009-domain-runtime-semantics-actions-capabilities-flows-and-session-outcomes.md)
  - Projection runtime semantics: [RFC-0010-projection-runtime-semantics-join-aggregate-timeline-and-history.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0010-projection-runtime-semantics-join-aggregate-timeline-and-history.md)
  - Guard runtime contracts: [RFC-0019-guard-and-invariant-runtime-contracts.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0019-guard-and-invariant-runtime-contracts.md)
  - Contract centralization: [RFC-0021-contract-centralization-and-referential-hardening-before-ga.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0021-contract-centralization-and-referential-hardening-before-ga.md)
  - Kernel product lane: [RFC-0022-kernel-runtime-core-and-standalone-adoption.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0022-kernel-runtime-core-and-standalone-adoption.md)
  - Supersedes/Superseded by: `none`

## Problem and context

Assume RFC-0021 is fully implemented and stable: contracts are centralized, referential typing is enforced, and cross-lane contract drift is controlled.

The next bottleneck is runtime architecture itself:

1. Domain, projection, and guard semantics are defined across separate RFCs but still materialize as fragmented runtime implementations.
2. Kernel ownership exists as a boundary direction, but runtime execution modules are still split by historical package seams.
3. Runtime package layout reflects incremental evolution rather than a coherent end-state execution model.
4. Track 04 can move forward, but without runtime recomposition we will incur avoidable structural debt in orchestration and testing surfaces.

Because no public version has shipped, we can take a deliberate architectural break and converge on one runtime model now.

## Goals

1. Replace fragmented runtime behavior paths with one kernel-oriented execution semantics model.
2. Recompose runtime packages so ownership is explicit and layering is enforceable.
3. Keep domain/projection/guard feature behavior deterministic while removing duplicate orchestration logic.
4. Finish with no legacy runtime package debt left in the mainline architecture.
5. Define a migration sequence that is fast, test-backed, and deletion-oriented.

## Non-goals

1. Changing authoring spec language or compiler UX beyond required runtime contract inputs.
2. Redesigning marketplace control-plane behavior.
3. Introducing long-lived compatibility facades for pre-reset runtime package paths.
4. Deferring package deletion after successful cutover.

## Product outcomes and success metrics

Outcomes:

1. Runtime behavior is explained by a single execution model rooted in kernel orchestration.
2. Domain/projection/guard behavior remains deterministic but no longer carries lane-local orchestration duplication.
3. Runtime package map becomes easier to navigate, enforce, and test.

Metrics:

- Product metric(s):
  - `100%` runtime execution entrypoints route through kernel-owned orchestration surfaces.
  - `0` duplicate orchestration implementations for policy order, envelope shaping, and host port validation.
- Reliability metric(s):
  - `0` kernel boundary regressions across domain/projection/guard golden fixtures during cutover.
  - `100%` runtime invocations emit canonical typed envelopes from shared contracts.
- Developer experience metric(s):
  - Runtime package discovery time (new engineer finding execution path) reduced to `<= 15 minutes` in onboarding runbook tests.
  - `100%` runtime package public exports mapped to one documented feature owner.
- Explicit latency/availability target(s) with numeric thresholds:
  - End-to-end orchestration overhead delta after recomposition p95 `<= +5ms` vs pre-cutover baseline (excluding provider I/O).

## Proposal

Perform a controlled runtime reset in which semantics and packages are recomposed around kernel-first orchestration.

Execution model:

1. Kernel owns invocation normalization, access/policy sequencing, envelope assembly, and cross-runtime coordination.
2. Domain runtime owns action/flow/session semantics only.
3. Projection runtime owns read-model semantics only.
4. Guard runtime owns invariant/guard evaluation semantics only.
5. Entrypoint/surface runtimes own transport binding and mapping only.

Recomposition principles:

1. No duplicate orchestration in domain/projection/guard modules.
2. Runtime packages expose one stable entrypoint per feature.
3. Legacy package internals are deleted after cutover, not retained as permanent aliases.
4. All runtime-facing contracts remain in `products/contracts/*`.

### Deterministic runtime behavior rules

- Input normalization order:
  - surface binding parse -> kernel input normalization -> policy/access checks -> feature runtime execution -> canonical envelope emission.
- Default precedence:
  - explicit invocation value > compiled artifact default > typed validation error.
- Unknown/null handling:
  - unknown keys fail at contract boundaries; `null` is accepted only where schema allows.
- Stable ordering requirements:
  - effects, diagnostics, emitted signals, and metadata fields are stable-sorted by canonical ordering rules.
- Idempotency/replay behavior (for write paths):
  - replay decision remains kernel+host contract driven and is uniformly applied before feature runtime execution.

## Ubiquitous language

1. `Runtime recomposition`: structural rewrite of runtime ownership and package layout without preserving legacy architecture.
2. `Execution spine`: kernel-owned orchestration path every runtime invocation must traverse.
3. `Feature semantic engine`: domain/projection/guard package that contains feature logic but not orchestration policy.
4. `Cutover checkpoint`: phase acceptance criteria that must be reviewed before deleting legacy paths.
5. `Legacy debt`: any runtime code path or package retained only for compatibility with pre-reset layout.

## Boundaries and ownership

- Surface adapters:
  - own transport-specific parse/map/serialize concerns.
  - must call kernel execution spine for runtime behavior.
- Kernel/domain runtime:
  - kernel owns orchestration sequence and envelope contract application.
  - domain runtime owns action/flow/session semantic evaluation.
- Capability adapters:
  - own external side effects behind declared capability and host ports.
- Host/platform adapters:
  - own principal, clock, idempotency store, history, and delegation primitives.

Must-not-cross constraints:

1. Domain/projection/guard runtime packages must not implement policy gate ordering.
2. Surface/entrypoint packages must not shape canonical runtime envelopes directly.
3. Kernel package must not embed domain/projection business semantics.
4. Runtime packages must not define new cross-lane contracts outside `products/contracts/*`.
5. Post-cutover, no execution path may depend on legacy runtime package internals.

## Contracts and typing

- Boundary schema authority:
  - Zod schemas under `products/contracts/*` remain canonical.
- Authoring format:
  - unchanged typed app spec compiled artifacts.
- Generated runtime artifact format:
  - unchanged artifact-model bundle/manifest contracts consumed by recomposed runtime.
- Canonical compiled artifact schema (required):
  - existing compiled app/domain/projection/guard sections with explicit kernel runtime inputs.
- Artifact version field and hash policy:
  - existing version/hash policy remains; runtime reset cannot weaken verification.
- Deterministic serialization rules:
  - runtime outputs retain stable key ordering and deterministic arrays for set-like fields.
- Allowed/disallowed schema features:
  - disallow raw exported `unknown` in runtime public APIs except explicit extension-point fields.
- Public contract shape:
  - `createKernelRuntime(input) -> KernelRuntime`
  - `KernelRuntime.invokeQuery(input) -> QueryResultEnvelope`
  - `KernelRuntime.invokeMutation(input) -> MutationResultEnvelope`
  - feature engines expose typed internal APIs only where required by kernel orchestration.
- Invocation/result/error/signal/diagnostics envelope schemas:
  - all execution envelopes source from canonical contracts (`surface`, `guard`, `projection`, `host`, and shared runtime envelope contracts).
- Envelope versioning strategy:
  - semver literal schema versions with major bump required for breaking envelope changes.
- Principal/auth context schema:
  - canonical principal context remains sourced from `@gooi/host-contracts/principal`.
- Access evaluation order:
  - kernel-enforced and test-backed as single canonical sequence.
- Error taxonomy:
  - preserve typed families from RFC-0002/RFC-0009/RFC-0010/RFC-0019; remove duplicate legacy aliases after cutover.
- Compatibility policy:
  - pre-GA hard breaks are allowed; we prefer direct migration over compatibility layers.
- Deprecation policy:
  - mark legacy runtime paths deprecated in cutover phase and delete in the immediately following phase.

## API and module plan

Feature-oriented module layout (end-state target):

1. `products/kernel/execution-kernel`
   - `src/runtime/create-kernel-runtime.ts`
   - `src/runtime/execute-invocation.ts`
   - `src/runtime/apply-policy-gates.ts`
   - `src/runtime/emit-envelope.ts`
2. `products/runtime/domain-runtime`
   - semantic engine only: action/flow/session execution.
3. `products/runtime/projection-runtime`
   - semantic engine only: projection/timeline execution.
4. `products/runtime/guard-runtime`
   - semantic engine only: invariant/guard evaluation.
5. `products/runtime/entrypoint-runtime`
   - transport-facing query/mutation entrypoint mapping only.
6. `products/runtime/surface-runtime`
   - ingress/egress surface binding only.

Public APIs via `package.json` exports:

1. `@gooi/execution-kernel/{create,entrypoint}` as canonical runtime orchestration surface.
2. `@gooi/entrypoint-runtime/{query,mutation}` for transport integration points.
3. Runtime semantic engines expose minimal explicit subpaths consumed by kernel only.
4. No wildcard or barrel export surfaces.

No barrel files:

1. use explicit subpath exports only.

Single entry per feature:

1. one kernel runtime creation entrypoint.
2. one canonical query invocation path.
3. one canonical mutation invocation path.
4. one semantic engine entry per runtime family.

## Package boundary classification

- Proposed location(s):
  - `products/kernel/*`
  - `products/runtime/*`
  - `products/contracts/*`
- Lane (if `products/*`):
  - `kernel`, `runtime`, `contracts`
- Why this boundary is correct:
  - kernel owns orchestration, runtime owns feature semantics, contracts remain centralized and shared.
- Primary consumers (internal/external):
  - internal runtime/surface/quality teams; external embedders consume kernel and selected runtime entrypoints.
- Coupling expectations (what it should and should not depend on):
  - kernel and runtime depend on contracts, never the reverse.
  - runtime semantic engines do not depend on surface transport packages.
  - surface packages depend on kernel and contracts, not on deep runtime internals.
- Why this is not a better fit in another boundary:
  - keeping orchestration distributed across runtime packages will continue structural drift and duplicated policy behavior.
- Promotion/demotion plan (if expected to move boundaries later):
  - if a semantic engine proves reusable across lanes beyond runtime ownership, extract contracts first, then revisit package boundary in a dedicated RFC.

## Delivery plan and rollout

Phase 1: Canonical semantics and cutover map

- Entry criteria:
  - RFC-0021 is implemented and stable.
  - RFC-0022 kernel boundary is accepted.
- Exit criteria:
  - one approved execution-spine contract and dependency map exists.
- Deliverables:
  - runtime recomposition design map.
  - explicit legacy-path deletion list.

Phase 2: Kernel-centric runtime wiring

- Entry criteria:
  - Phase 1 complete.
- Exit criteria:
  - query/mutation execution routes through kernel spine with no legacy orchestration path.
- Deliverables:
  - kernel-first orchestration wiring.
  - lint boundary rules and ownership docs that make non-kernel orchestration reintroduction explicit.

Phase 3: Semantic engine extraction and package reset

- Entry criteria:
  - Phase 2 boundary linting and ownership checklist accepted.
- Exit criteria:
  - domain/projection/guard packages no longer implement orchestration policy.
  - runtime package internals match target ownership model.
- Deliverables:
  - refactored semantic engine modules.
  - removed duplicated policy/envelope code.

Phase 4: Legacy deletion and boundary hardening

- Entry criteria:
  - Phase 3 complete and workspace lint/typecheck/test baseline green.
- Exit criteria:
  - all legacy runtime paths deleted.
  - boundary linting and ownership docs prevent reintroduction.
- Deliverables:
  - runtime package cleanup PR(s).
  - lint rule set, architecture notes, and enforcement docs.

## Test strategy and acceptance criteria

1. Unit coverage:
   - kernel policy order and envelope assembly.
   - semantic engine correctness for domain/projection/guard families.
2. Integration coverage:
   - end-to-end query and mutation paths through surface -> kernel -> semantic engine -> envelope.
3. Conformance coverage:
   - existing conformance suites plus runtime recomposition kernel-boundary suite.
4. Determinism/golden coverage:
   - identical fixture inputs produce byte-stable envelopes, diagnostics, and signal metadata.

Definition of done:

1. runtime invocations no longer rely on legacy orchestration paths.
2. cutover checklist is complete and legacy runtime paths are deleted.
3. docs and ownership maps match shipped package boundaries.
4. `bun run typecheck` and `bun run test` pass on final cutover branch.

## Operational readiness

1. Observability and tracing:
   - stage-level telemetry for kernel normalization, policy gate, semantic engine execution, and envelope emit.
2. Failure handling and retries:
   - typed failures for contract mismatch, policy denial, and runtime semantic errors with deterministic retry hints.
3. Security requirements:
   - no bypass around principal validation and host policy order.
4. Runbooks and incident readiness:
   - runtime cutover rollback/forward runbook and kernel-boundary failure triage guide.
5. Alert thresholds tied to service-level targets:
   - unexpected boundary-lint violations > `0` in release candidate reviews.
   - envelope determinism regression count > `0` per release candidate.
   - kernel orchestration overhead p95 exceeds target by `> 10%` for 24h.

## Risks and mitigations

1. Risk: broad refactor introduces hidden runtime regressions.
   - Mitigation: strict kernel-boundary harness and phased deletion checklist.
2. Risk: package reset causes temporary contributor confusion.
   - Mitigation: publish package ownership map and migration notes before Phase 3.
3. Risk: kernel package becomes a catch-all module.
   - Mitigation: enforce kernel charter and reject feature-semantic logic in kernel reviews.
4. Risk: long-lived branches delay integration.
   - Mitigation: phase-by-phase merge strategy with explicit merge criteria.

## Alternatives considered

1. Keep existing runtime packages and only patch obvious duplication.
   - Rejected: slows progress and leaves structural debt in place.
2. Rebuild runtime as a single monolithic package.
   - Rejected: loses clear ownership and test boundaries.
3. Postpone runtime reset until after initial public release.
   - Rejected: avoidable debt and migration cost increases sharply after external adoption.

## Open questions

1. Should `@gooi/execution-kernel` remain the canonical orchestration package name, or align to `@gooi/kernel-runtime` before Phase 2?
   - Owner: `Kernel Platform`
   - Target decision date: `2026-03-05`
2. Should `entrypoint-runtime` remain a separately published package after recomposition, or become kernel-owned internals with surface-level adapters only?
   - Owner: `Runtime Platform`
   - Target decision date: `2026-03-05`
3. Do we keep a one-phase temporary re-export window for developer ergonomics, or enforce immediate path hard-break at Phase 4 start?
   - Resolved: enforce immediate path hard-break at Phase 4 start (no temporary re-export window).

## Decision log

- `2026-02-27` - Draft created as explicit post-RFC-0021 planning RFC for runtime semantics replacement and runtime package reset.
- `2026-02-27` - Declared deletion-oriented cutover strategy (no long-lived compatibility layer) as default posture.
- `2026-02-27` - Removed old-vs-new coexistence framing; kernel-boundary enforcement is the only cutover checkpoint.
