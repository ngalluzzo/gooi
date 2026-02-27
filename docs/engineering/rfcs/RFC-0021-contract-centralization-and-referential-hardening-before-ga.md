# RFC-0021: Contract Centralization and Referential Hardening Before GA

## Metadata

- RFC: `RFC-0021`
- Title: `Contract Centralization and Referential Hardening Before GA`
- Status: `Draft`
- Owners: `Platform Architecture`, `Authoring Platform`, `Runtime Platform`, `Quality Platform`
- Reviewers: `Developer Experience`, `Marketplace Platform`
- Created: `2026-02-27`
- Updated: `2026-02-27`
- Target release: `Pre-GA Architecture Freeze`
- Related:
  - North star: [RFC-0007-north-star-platform-shape-and-progressive-dx-api.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0007-north-star-platform-shape-and-progressive-dx-api.md)
  - Authoring intelligence: [RFC-0003-product-authoring-intelligence-lsp-and-capability-index.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0003-product-authoring-intelligence-lsp-and-capability-index.md)
  - Full app spec: [RFC-0008-full-app-spec-contract-and-canonical-compiler-model.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0008-full-app-spec-contract-and-canonical-compiler-model.md)
  - Artifact model: [RFC-0013-artifact-model-v2-lane-artifacts-manifest-and-packaged-bundle.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0013-artifact-model-v2-lane-artifacts-manifest-and-packaged-bundle.md)
  - Conformance expansion: [RFC-0015-cross-lane-conformance-expansion-l0-l3-parity-and-determinism-gates.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0015-cross-lane-conformance-expansion-l0-l3-parity-and-determinism-gates.md)

## Problem and context

Gooi has not shipped a public version yet, but contract boundaries are already drifting:

1. Cross-lane contracts are split across `packages/*` and `products/*/*`.
2. The canonical app spec contract currently lives inside `@gooi/spec-compiler` instead of a shared contracts package.
3. Shared concepts are repeated with lane-local copies instead of strong referential contracts.
4. Publicly exported contract surfaces still carry broad `unknown` shapes in places where typed contracts should exist.

Current landscape snapshot (as of `2026-02-27`):

1. 37 contract-related source files across apps/packages/products.
2. 94 `unknown` occurrences across 22 of those files.
3. Repeated conformance report/check shapes across 9 conformance modules.
4. Position/range and diagnostics concepts modeled in multiple places.

This is pre-GA, so we can and should break architecture now instead of carrying avoidable debt forward.

## Goals

1. Establish one enforceable rule for cross-lane contracts: they live in `packages/*`.
2. Move the app spec contract into a dedicated shared package and make all lanes import it by reference.
3. Remove weakly typed shared contract surfaces and replace them with named canonical types.
4. Eliminate concept duplication for core envelopes, diagnostics, identity, and conformance result shapes.
5. Add CI gates that fail on new boundary drift or untyped exported contract fields.

## Non-goals

1. Redesigning runtime semantics beyond contract surface normalization.
2. Shipping backward compatibility for pre-release internal imports as a product guarantee.
3. Solving future marketplace contract families not yet implemented.
4. Rewriting internal implementation details that are not shared boundary contracts.

## Product outcomes and success metrics

Outcomes:

1. Every lane composes from one canonical contract graph.
2. Contract consumers use referential imports, not copied local shape definitions.
3. Contract drift is prevented by automation, not manual review alone.

Metrics:

- Product metric(s):
  - `100%` of cross-lane contract exports resolve from `packages/*`.
  - `0` cross-lane contract modules exported from `products/*/*` except temporary deprecation shims explicitly listed in this RFC.
- Reliability metric(s):
  - `100%` contract determinism tests pass after migration.
  - `0` CI passes when forbidden boundary imports are present.
- Developer experience metric(s):
  - `100%` of exported contract modules publish explicit Zod schema + inferred type pairs where runtime parsing is required.
  - `0` `unknown` fields in exported shared contract surfaces unless explicitly marked as extension points.
- Explicit latency/availability target(s) with numeric thresholds:
  - Added contract-boundary lint/typecheck overhead p95 `< 10s` in CI.
  - `bun test:pkg` regression from migration `< 5%` compared to pre-migration baseline.

## Proposal

Perform a pre-GA architecture break that centralizes shared contracts and hardens referential typing.

Canonical boundary rule:

1. If a contract is consumed by more than one lane (`authoring`, `runtime`, `quality`, `marketplace`, `apps`), it must be defined in `packages/*`.
2. `products/*/*` may define private contracts only when they are consumed exclusively inside that package.

Mandatory package moves and creations:

1. Create `packages/app-spec-contracts`.
2. Move `GooiAppSpec` schema family from `@gooi/spec-compiler/authoring-spec` to `@gooi/app-spec-contracts/spec`.
3. Move canonical compiled section contracts from `@gooi/spec-compiler/contracts` into `@gooi/app-spec-contracts/compiled` where stable and cross-lane.
4. Move `products/authoring/authoring-contracts` to `packages/authoring-contracts` while keeping package name `@gooi/authoring-contracts`.
5. Create `packages/conformance-contracts` for reusable conformance primitives:
   - `CheckResult`
   - `SuiteReport`
   - `DiagnosticRecord`
   - shared input shape fragments.
6. Keep feature-specific conformance IDs and fixture-specific inputs in `@gooi/conformance`, but compose from `@gooi/conformance-contracts` primitives.

Hardening constraints:

1. Exported shared contract fields may not use raw `unknown` except in explicit extension fields named `extensions` or `payload` with companion typed discriminators.
2. Position/range contracts must come from a single shared module for authoring-facing APIs.
3. Diagnostics contracts must use one shared diagnostic base type across compiler, conformance, and editor adapters.
4. Artifact identity contracts must compose from artifact-model primitives instead of redefining ad hoc hash/version tuples.

Deterministic behavior rules:

- Input normalization order:
  - parse with canonical schemas -> normalize keys/order -> validate cross references -> emit artifacts/envelopes.
- Default precedence:
  - explicit value > schema default > compile/validation error.
- Unknown/null handling:
  - unknown keys rejected by default unless in explicit extension namespaces.
  - `null` accepted only when the schema explicitly allows it.
- Stable ordering requirements:
  - diagnostics sorted by `path`, then `code`, then `message`.
  - set-like arrays emitted in lexical order.
- Idempotency/replay behavior (for write paths):
  - unchanged runtime semantics; only contract ownership and typing are changed.

## Ubiquitous language

1. `Cross-lane contract`: any exported contract consumed by more than one lane.
2. `Referential contract`: a consumer imports canonical contract types/schemas instead of redefining shape.
3. `Private product contract`: contract used only inside one `products/<lane>/<pkg>` package.
4. `Contract drift`: semantic mismatch between duplicated representations of the same concept.
5. `Extension point`: intentionally untyped payload area with explicit policy and discriminator.

## Boundaries and ownership

- Surface adapters:
  - consume shared contracts only.
  - may not define canonical envelope or diagnostics contracts.
- Kernel/domain runtime:
  - consumes shared compiled/app/spec contracts.
  - may define runtime-private helper contracts locally.
- Capability adapters:
  - consume capability/host/surface shared contracts.
  - may not redefine shared capability identity or effect contracts.
- Host/platform adapters:
  - consume host contracts and artifact contracts.
  - may not redefine principal/identity envelope semantics.

Must-not-cross constraints:

1. `products/*/*` must not export cross-lane canonical contracts after migration completion.
2. Shared contract packages must not depend on runtime/authoring product behavior packages.
3. Conformance package must not own canonical reusable contract primitives.
4. Apps must not define contract copies for concepts already available from `packages/*`.

## Contracts and typing

- Boundary schema authority:
  - Zod schemas in shared contract packages are canonical.
- Authoring format:
  - Typed Gooi YAML contracts parsed via shared app-spec schemas.
- Generated runtime artifact format:
  - Deterministic JSON artifacts with stable hash policy from artifact model.
- Canonical compiled artifact schema (required):
  - `GooiAppSpec` and related section schemas from `@gooi/app-spec-contracts/spec`.
  - canonical compiled app/entrypoint section contracts from `@gooi/app-spec-contracts/compiled`.
  - lane artifacts and manifest from `@gooi/artifact-model/*`.
- Artifact version field and hash policy:
  - Reuse artifact-model policies; no lane-local redefinition.
- Deterministic serialization rules:
  - stable key ordering, deterministic arrays for set-like data, typed parser/serializer parity tests.
- Allowed/disallowed schema features:
  - disallow raw `unknown` in exported shared contract surfaces except explicit extension points.
- Public contract shape:
  - one schema export and one type export per public payload.
- Invocation/result/error/signal/diagnostics envelope schemas:
  - canonical envelope fields must be sourced from shared envelope/diagnostic primitives.
- Envelope versioning strategy:
  - literal semantic versions in schema, upgrade via additive-first policy.
- Principal/auth context schema:
  - only from `@gooi/host-contracts/principal`.
- Access evaluation order:
  - unchanged behavior; contract references normalized.
- Error taxonomy:
  - central typed error code families per lane with shared base diagnostic contract.
- Compatibility policy:
  - pre-GA breaking changes allowed and expected.
  - no long-lived compatibility aliases; temporary shims allowed only for one migration phase.
- Deprecation policy:
  - deprecate moved paths immediately and delete in the next phase once all dependents are migrated.

## API and module plan

Feature-oriented module layout:

1. `packages/app-spec-contracts`
   - `src/spec/*`
   - `src/compiled/*`
   - `src/diagnostics/*`
2. `packages/authoring-contracts`
   - existing authoring lockfile and envelope contracts migrated from `products/authoring/authoring-contracts`.
3. `packages/conformance-contracts`
   - `src/checks/*`
   - `src/reports/*`
   - `src/diagnostics/*`

Public APIs via `package.json` exports:

1. `@gooi/app-spec-contracts/{spec,compiled,diagnostics}`
2. `@gooi/authoring-contracts/{lockfile,envelopes/*}`
3. `@gooi/conformance-contracts/{checks,reports,diagnostics}`

No barrel files:

1. Use explicit subpath exports only.

Single entry per feature:

1. one parse entry + one build/compile entry per contract family.

## Package boundary classification

- Proposed location(s):
  - `packages/app-spec-contracts`
  - `packages/authoring-contracts`
  - `packages/conformance-contracts`
  - `products/authoring/spec-compiler`
  - `products/quality/conformance`
- Lane (if `products/*`):
  - `authoring`
  - `quality`
- Why this boundary is correct:
  - shared reusable primitives belong in `packages/*`; lane behavior remains in `products/*/*`.
- Primary consumers (internal/external):
  - internal: authoring, runtime, quality, apps, marketplace adapters.
  - external: SDK users consuming typed contracts.
- Coupling expectations:
  - contract packages may depend on other contract or utility packages only.
  - product packages may depend on contract packages, never the reverse.
- Why this is not a better fit in another boundary:
  - putting cross-lane contracts in product packages makes ownership and reuse ambiguous.
- Promotion/demotion plan:
  - promote only truly shared stable primitives.
  - demote any package contract that proves lane-private back into its product package.

## Delivery plan and rollout

Phase 1: Contract package creation and path wiring

- Entry criteria:
  - RFC accepted.
- Exit criteria:
  - new contract packages exist with passing typecheck/tests.
  - spec-compiler and authoring imports compile against new packages.
- Deliverables:
  - `packages/app-spec-contracts`.
  - `packages/conformance-contracts`.
  - `packages/authoring-contracts` path migration.

Phase 2: Referential migration and duplication removal

- Entry criteria:
  - Phase 1 complete.
- Exit criteria:
  - all cross-lane consumers import canonical packages.
  - duplicate concept definitions removed from product packages.
- Deliverables:
  - migration PRs across runtime/quality/apps.
  - deleted deprecated local copies.

Phase 3: Hardening gates and debt burn-down

- Entry criteria:
  - Phase 2 complete.
- Exit criteria:
  - CI enforces boundary and typing constraints.
  - `0` forbidden `unknown` usage in exported shared contract surfaces.
- Deliverables:
  - contract boundary lint checks.
  - export-surface unknown checker.
  - contract dependency graph gate.

Phase 4: Shim removal and freeze

- Entry criteria:
  - all packages green with gates enabled.
- Exit criteria:
  - temporary re-export shims deleted.
  - architecture freeze baseline recorded.
- Deliverables:
  - final cleanup PR.
  - architecture freeze checklist report.

## Test strategy and acceptance criteria

1. Unit tests for every new/moved contract parser/schema.
2. Golden determinism tests for compiled artifacts and envelopes.
3. Contract conformance tests validating cross-lane parse/serialize parity.
4. Repo-wide import graph test asserting boundary rule compliance.
5. CI contract-surface scanner that fails when exported shared contracts introduce raw `unknown` outside allowed extension points.

Definition of done:

1. `bun run typecheck`, `bun run test`, and conformance suites all pass.
2. zero boundary violations.
3. zero unresolved temporary shims.
4. docs and API references regenerated and green.

## Operational readiness

1. Observability and tracing:
   - contract parse/validation error codes and counts tracked per package.
2. Failure handling and retries:
   - fail fast on schema mismatch with deterministic diagnostics.
3. Security requirements:
   - artifact hash/integrity fields must remain verifiable and typed.
4. Runbooks and incident readiness:
   - add migration rollback and broken-import runbook for boundary cutovers.
5. Alert thresholds tied to service-level targets:
   - contract CI gate failures alert when failure rate exceeds `5%` of mainline runs over 24h.

## Risks and mitigations

1. Risk: migration churn causes temporary development slowdown.
   - Mitigation: phase-by-phase cutover and automated codemods for import rewrites.
2. Risk: over-hardening blocks legitimate extension use cases.
   - Mitigation: explicit extension-point policy and allowlist-based `unknown` exceptions.
3. Risk: hidden consumers of moved paths break unexpectedly.
   - Mitigation: repo-wide dependency graph + compile checks before deleting shims.
4. Risk: conformance contract extraction over-generalizes too early.
   - Mitigation: extract only shared primitives, keep lane-specific inputs local.

## Alternatives considered

1. Keep current structure and document conventions only.
   - Rejected: conventions without enforcement will drift.
2. Move everything named `contracts` into `products/quality`.
   - Rejected: quality is a consumer lane, not contract ownership authority.
3. Use only compatibility re-exports and postpone hard break.
   - Rejected: defers debt into pre-GA window and weakens future migration leverage.

## Open questions

1. Should `@gooi/spec-compiler/contracts` remain as a thin facade forever or be removed after one migration phase?
   - Owner: `Authoring Platform`
   - Due: `2026-03-06`
2. Should `@gooi/conformance` continue exporting per-feature `*-contracts` paths once `@gooi/conformance-contracts` exists?
   - Owner: `Quality Platform`
   - Due: `2026-03-06`

## Decision log

- `2026-02-27` - Draft created to mandate pre-GA contract centralization and referential hardening.
