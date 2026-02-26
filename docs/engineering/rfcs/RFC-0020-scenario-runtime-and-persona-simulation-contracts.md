# RFC-0020: Scenario Runtime and Persona Simulation Contracts

## Metadata

- RFC: `RFC-0020`
- Title: `Scenario Runtime and Persona Simulation Contracts`
- Status: `Proposed`
- Owners: `Quality`, `Product Platform`
- Reviewers: `Runtime Platform`, `Developer Experience`, `Marketplace`
- Created: `2026-02-26`
- Updated: `2026-02-26`
- Target release: `Quality Milestone Q2`
- Related:
  - Spec source: [demo.yml](/Users/ngalluzzo/repos/gooi/docs/demo.yml)
  - Full spec model: [RFC-0008-full-app-spec-contract-and-canonical-compiler-model.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0008-full-app-spec-contract-and-canonical-compiler-model.md)
  - Domain runtime: [RFC-0009-domain-runtime-semantics-actions-capabilities-flows-and-session-outcomes.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0009-domain-runtime-semantics-actions-capabilities-flows-and-session-outcomes.md)
  - Projection runtime: [RFC-0010-projection-runtime-semantics-join-aggregate-timeline-and-history.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0010-projection-runtime-semantics-join-aggregate-timeline-and-history.md)
  - Guard contracts: [RFC-0019-guard-and-invariant-runtime-contracts.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0019-guard-and-invariant-runtime-contracts.md)
  - Conformance: [RFC-0015-cross-lane-conformance-expansion-l0-l3-parity-and-determinism-gates.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0015-cross-lane-conformance-expansion-l0-l3-parity-and-determinism-gates.md)

## Problem and context

The app spec already includes `personas` and `scenarios`, but runtime execution
contracts for authored simulations are not fully canonicalized.

Product gap:

1. Scenario execution semantics (`trigger`, `expect`, `capture`) are only partially standardized.
2. Persona-aware generation and deterministic replay behavior are not fully contractized.
3. Simulation outcomes are not yet a first-class typed runtime artifact family.

Without this RFC, authored scenarios risk becoming documentation instead of
reliable behavioral contracts.

## Goals

1. Define canonical runtime semantics for scenario execution.
2. Define persona participation rules for context and generated trigger input.
3. Define deterministic lockfile behavior for generated scenario inputs.
4. Define typed scenario run envelopes, reports, and failure taxonomy.
5. Define selective execution and coverage reporting contracts for persona/scenario quality signals.

## Non-goals

1. Defining non-technical authoring UI.
2. Replacing unit/integration test suites in product packages.
3. Defining marketplace recommendation/ranking simulation internals.
4. Replacing existing runtime semantics RFC ownership boundaries.

## Product outcomes and success metrics

Outcomes:

1. Scenario definitions in spec become executable behavioral contracts.
2. Persona knowledge becomes runtime-validated product behavior, not external documentation.
3. Simulation runs are deterministic by default and reviewable in PR workflows.

Metrics:

- Product metric(s):
  - `100%` compiled scenarios execute through one canonical scenario runtime entrypoint.
  - `100%` scenario outcomes emit typed run envelopes and step results.
- Reliability metric(s):
  - `100%` lockfile-backed generated triggers replay deterministically by default.
  - `0` silent generated-input drift without lockfile diff visibility.
- Developer experience metric(s):
  - Scenario run diagnostics include step id + expected contract id `100%`.
  - Persona coverage report generated deterministically for tagged run sets.
- Explicit latency/availability target(s) with numeric thresholds:
  - Scenario orchestration overhead p95 `< 30ms` excluding underlying runtime/provider I/O.
  - Persona coverage report generation p95 `< 100ms` for fixture app.

## Proposal

Define `scenario-runtime` as canonical execution engine for compiled scenario contracts.

### Scenario execution model

1. Scenario context:
   - `principal`
   - `session` seed
   - `persona`
   - optional `provider_overrides`
2. Step model:
   - `trigger` step executes query/mutation/route contract.
   - `expect` step validates signal/query/flow outcomes with structural/semantic guards.
   - `capture` step binds runtime values for downstream step references.

### Real wiring contract

1. Scenario execution uses canonical runtime surfaces and compiled wiring contracts.
2. Provider overrides are explicit and typed, never implicit test-only shortcuts.
3. Scenario runtime must not redefine entrypoint/domain/projection semantics.

### Persona contract

1. Persona context is included in semantic evaluation context where supported.
2. `generate: true` trigger inputs may be synthesized from persona definition + scenario context.
3. Persona artifacts are versioned under compiled scenarios section.

### Deterministic lockfile model for generated triggers

1. `generate: true` results are snapshotted into lockfile on successful run.
2. Subsequent runs replay lockfile-generated inputs by default.
3. Explicit refresh command regenerates candidates and updates lockfile only on passing run set.

### Selective execution and reporting

1. Scenario runtime supports tagged selection (`smoke`, `cs-authored`, `edge-case`, etc.).
2. Scenario run report includes per-scenario and per-step outcomes.
3. Persona coverage report includes scenario pass/fail/coverage counts by persona id.

### Deterministic runtime behavior rules

- Input normalization order:
  - load compiled scenario -> apply context defaults -> resolve captures -> run step.
- Default precedence:
  - explicit scenario step input > captured value > generated value (when generation enabled).
- Unknown/null handling:
  - unknown step keys fail compile/validation.
  - `null` expectations are explicit and preserved.
- Stable ordering requirements:
  - scenarios execute in deterministic id order unless selection overrides.
  - steps execute in authored order.
  - reports are sorted by scenario id -> step index -> check id.
- Idempotency/replay behavior (for write paths):
  - scenario runtime reuses entrypoint/domain replay semantics; no scenario-local replay dialect.

## Ubiquitous language

1. `Scenario`: authored sequence of triggers and expectations.
2. `Persona context`: authored customer archetype bound to scenario run.
3. `Generated trigger`: runtime-synthesized step input from persona/context.
4. `Scenario lock snapshot`: deterministic stored generated input set for replay.
5. `Persona coverage`: coverage/pass signal by persona across selected scenario sets.

## Boundaries and ownership

- Surface adapters:
  - no ownership of scenario semantics; only dispatch/transport roles.
- Kernel/domain/projection runtime:
  - own business behavior; scenario runtime orchestrates calls only.
- Scenario runtime:
  - owns sequence orchestration, capture resolution, and report generation.
- Capability adapters:
  - may participate through standard runtime calls; no scenario-specific shortcuts.
- Host/platform adapters:
  - own lockfile persistence, process-level execution, and telemetry transport.

Must-not-cross constraints:

1. Scenario runtime must not bypass runtime policy gates or access checks.
2. Persona generation must not alter deterministic behavior unless explicitly refreshed.
3. Provider overrides must remain explicit and auditable in run reports.

## Contracts and typing

- Boundary schema authority:
  - Zod contracts for compiled scenarios, run requests, run results, and coverage reports.
- Authoring format:
  - `personas` and `scenarios` sections in canonical app spec.
- Generated runtime artifact format:
  - `CompiledScenarioPlanSet@1.0.0`.
- Canonical compiled artifact schema (required):
  - `CompiledPersonaDefinition`
  - `CompiledScenarioPlan`
  - `CompiledScenarioPlanSet`
- Artifact version field and hash policy:
  - scenario plan set includes section hash and aggregate artifact reference hash.
- Deterministic serialization rules:
  - stable scenario/step ordering and stable capture key ordering.
- Allowed/disallowed schema features:
  - disallow ambiguous step types and unsupported expectation targets.
- Public contract shape:
  - `runScenario(input) -> ScenarioRunEnvelope`
  - `runScenarioSuite(input) -> ScenarioSuiteReport`
  - `reportPersonaCoverage(input) -> PersonaCoverageReport`
- Invocation/result/error/signal/diagnostics envelope schemas:
  - `ScenarioRunEnvelope@1.0.0`
  - `ScenarioStepResultEnvelope@1.0.0`
  - `ScenarioSuiteReport@1.0.0`
  - `PersonaCoverageReport@1.0.0`
- Envelope versioning strategy:
  - semver literal `1.0.0` initial.
- Principal/auth context schema:
  - scenario context principal uses canonical principal contract.
- Access evaluation order:
  - unchanged; scenario-triggered entrypoints must pass standard access checks.
- Error taxonomy:
  - `scenario_trigger_error`
  - `scenario_expectation_error`
  - `scenario_guard_error`
  - `scenario_capture_error`
  - `scenario_generation_error`
  - `scenario_lockfile_error`
- Compatibility policy:
  - breaking scenario plan changes require major.
- Deprecation policy:
  - scenario step field deprecations require replacement metadata and diagnostics.

## API and module plan

Feature-oriented module layout:

1. `products/quality/scenario-runtime`
   - `src/run/*`
   - `src/steps/*`
   - `src/capture/*`
   - `src/persona/*`
   - `src/reports/*`
2. `packages/scenario-contracts`
   - scenario/persona plans, run envelopes, coverage reports.

Public APIs via `package.json` exports:

1. `@gooi/scenario-runtime/{run,suite,coverage}`
2. `@gooi/scenario-contracts/{plans,envelopes,reports,errors}`

No barrel files:

1. explicit subpath exports only.

Single entry per feature:

1. one single-scenario run entrypoint.
2. one scenario-suite run entrypoint.
3. one persona-coverage report entrypoint.

## Package boundary classification

- Proposed location(s):
  - `products/quality/scenario-runtime`
  - `packages/scenario-contracts`
- Lane (if `products/*`):
  - `quality`
- Why this boundary is correct:
  - scenario orchestration and coverage are quality/runtime verification behavior, with reusable contracts.
- Primary consumers (internal/external):
  - conformance pipelines, app teams, authoring tooling, facade testing helpers.
- Coupling expectations:
  - depends on compiled scenarios, runtime invocation contracts, and lockfile contracts.
  - must not depend on private adapter internals.
- Why this is not a better fit in another boundary:
  - embedding in authoring or domain runtime would blur runtime semantics vs quality orchestration ownership.
- Promotion/demotion plan:
  - stable scenario contracts may be promoted for external SDK use after adoption hardens.

## Delivery plan and rollout

Phase 1: scenario and persona contract publication

- Entry criteria:
  - RFC approved.
- Exit criteria:
  - compiled scenario/persona contracts and run envelopes published.
- Deliverables:
  - `@gooi/scenario-contracts` baseline.

Phase 2: scenario runtime integration

- Entry criteria:
  - Phase 1 complete.
- Exit criteria:
  - canonical scenario runtime executes trigger/expect/capture semantics against runtime lanes.
- Deliverables:
  - scenario runtime module and deterministic reports.

Phase 3: lockfile generation and coverage hardening

- Entry criteria:
  - Phase 2 complete.
- Exit criteria:
  - generated trigger lock snapshots and persona coverage reporting are release-gated.
- Deliverables:
  - lockfile refresh flow + persona coverage reports + conformance fixtures.

## Test strategy and acceptance criteria

1. Unit:
   - step execution, capture resolution, lock snapshot behavior.
2. Integration:
   - scenario runs invoking canonical query/mutation/flow behaviors.
3. Golden:
   - deterministic scenario suite reports and lockfile diff outputs.
4. Conformance:
   - parity of scenario outcomes across progressive runtime modes.
5. Fault tests:
   - generation failures, lockfile conflicts, provider override mismatches, capture reference errors.

Definition of done:

1. scenarios in `demo.yml` execute as first-class contracts, not ad hoc fixtures.
2. persona-aware generation is deterministic by default through lock snapshots.
3. scenario and persona reports are typed, deterministic, and CI-consumable.

## Operational readiness

1. Observability:
   - scenario pass/fail rates, step failure categories, generation usage rates.
2. Failure handling:
   - deterministic failure envelopes and lockfile-safe rollback behavior.
3. Security requirements:
   - generation and report paths must redact sensitive fields by policy.
4. Runbooks:
   - lockfile drift triage, generation outage handling, flaky semantic expectation triage.
5. Alert thresholds:
   - scenario suite failure rate > `2%` over 24h on default branch.
   - persona coverage drop > `20%` for any required persona cohort.

## Risks and mitigations

1. Risk: Generated inputs cause flaky outcomes.
   - Mitigation: lockfile snapshot replay by default and explicit refresh workflow.
2. Risk: Scenario runtime becomes a parallel test framework.
   - Mitigation: strict boundary that scenario runtime orchestrates canonical runtime contracts only.
3. Risk: Persona modeling drift reduces usefulness.
   - Mitigation: explicit coverage reporting and versioned persona contracts.

## Alternatives considered

1. Keep scenarios as non-runtime fixture docs only.
   - Rejected: behavior drift risk and weak organizational trust.
2. Build simulation only as external test harness.
   - Rejected: splits spec from executable behavior contracts.
3. Disable generated triggers and require explicit inputs only.
   - Rejected: blocks persona-driven authored coverage goals.

## Open questions

None.

## Decision log

- `2026-02-26` - Established scenarios and personas as first-class executable runtime contracts.
- `2026-02-26` - Established lockfile-backed deterministic replay as default behavior for generated triggers.
- `2026-02-26` - Resolved provider-overrides policy: disallow provider overrides in default CI runs; allow only in explicit simulation profiles.
- `2026-02-26` - Resolved generated-trigger policy: `generate: true` is disallowed for production smoke suites and restricted to simulation/pre-merge suites.
- `2026-02-26` - Resolved persona-coverage release policy for `1.0.0`: report-only initially; hard-gate thresholds deferred to a later milestone.
