# RFC-0023: North-Star Authoring Contract Convergence

## Metadata

- RFC: `RFC-0023`
- Title: `North-Star Authoring Contract Convergence`
- Status: `Draft`
- Owners: `Platform Architecture`, `Authoring Platform`, `Runtime Platform`
- Reviewers: `Quality Platform`, `Developer Experience`
- Created: `2026-03-01`
- Updated: `2026-03-01`
- Target release: `Post-Track-08 Convergence Window`
- Related:
  - North star: [RFC-0007-north-star-platform-shape-and-progressive-dx-api.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0007-north-star-platform-shape-and-progressive-dx-api.md)
  - Full app spec contract: [RFC-0008-full-app-spec-contract-and-canonical-compiler-model.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0008-full-app-spec-contract-and-canonical-compiler-model.md)
  - Domain runtime semantics: [RFC-0009-domain-runtime-semantics-actions-capabilities-flows-and-session-outcomes.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0009-domain-runtime-semantics-actions-capabilities-flows-and-session-outcomes.md)
  - Projection runtime semantics: [RFC-0010-projection-runtime-semantics-join-aggregate-timeline-and-history.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0010-projection-runtime-semantics-join-aggregate-timeline-and-history.md)
  - Surface dispatch contracts: [RFC-0011-route-and-surface-dispatch-contracts-web-http-cli-and-webhook.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0011-route-and-surface-dispatch-contracts-web-http-cli-and-webhook.md)
  - View render IR: [RFC-0012-view-render-ir-and-renderer-adapter-contract.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0012-view-render-ir-and-renderer-adapter-contract.md)
  - Demo spec source: [demo.yml](/Users/ngalluzzo/repos/gooi/docs/demo.yml)
  - Issues/PRs: `TBD`
  - Supersedes/Superseded by: `none`

## Problem and context

The current `docs/demo.yml` expresses the intended north-star product language,
but it is not a compile-green canonical spec under current contracts and compiler
rules. This creates two sources of truth:

1. canonical executable contracts used by compiler/runtime.
2. richer north-star authoring language used in `demo.yml`.

This gap now slows roadmap closure and makes "implemented" status ambiguous.

## Goals

1. Make `docs/demo.yml` compile as a canonical spec with zero compile errors.
2. Align contract schemas with the north-star authoring language instead of forcing demo-level downscoping.
3. Keep kernel ownership intact: semantics execute through compiler IR and runtime boundaries, not ad hoc adapter behavior.
4. Define one explicit migration boundary for old/new shapes and remove ambiguity quickly.

## Non-goals

1. Preserving backward compatibility for every pre-convergence authoring shape.
2. Rewriting kernel/domain runtime architecture.
3. Introducing a second parallel spec contract family.

## Product outcomes and success metrics

- Product metric(s):
  - `100%` of `docs/demo.yml` sections compile through `compileEntrypointBundle`.
  - `0` north-star features in `demo.yml` blocked by schema mismatch.
- Reliability metric(s):
  - `0` compile errors for canonical demo.
  - `100%` deterministic artifact hash parity across repeat compiles.
- Developer experience metric(s):
  - `1` authoritative authoring language for docs + compiler.
  - `100%` of newly introduced authoring constructs represented in contracts and test fixtures.
- Explicit latency/availability target(s) with numeric thresholds:
  - Compiler p95 regression from convergence changes `< 10%`.
  - Added conformance suite wall-clock regression `< 15%`.

## Proposal

Adopt a clean-break convergence cut where canonical contracts are expanded to
match the north-star authoring model currently documented in `demo.yml`.

Primary contract changes:

1. `domain.capabilities` supports authored capability definitions (`in/out/do/return`) as first-class domain semantics.
2. `views.nodes` supports declarative render graph fields (`props`, `children`), and `views.screens` supports `root_nodes` and query `args`.
3. Projection authoring accepts the north-star key vocabulary (`collection`, `page_arg`, `default_page_size`, etc.) and compiles to existing canonical projection IR.
4. Surface dispatch matcher policy is explicit for web surfaces, including deterministic defaults when method/path/route are absent.

Include deterministic runtime behavior rules:

- Input normalization order:
  - parse -> normalize aliases -> section validation -> cross-link validation -> IR compilation.
- Default precedence:
  - explicit authored value > section default > compile diagnostic.
- Unknown/null handling:
  - unknown keys rejected outside approved extension points.
  - `null` preserved only where schema explicitly allows it.
- Stable ordering requirements:
  - diagnostics sorted deterministically.
  - normalized maps/sets emitted with lexical ordering.
- Idempotency/replay behavior (for write paths):
  - unchanged; convergence only affects contract/compile path, not replay semantics.

## Ubiquitous language

1. `Convergence cut`: one intentional versioned change that aligns contracts to north-star language.
2. `North-star construct`: authoring shape already documented as intended product semantics.
3. `Canonical executable demo`: `docs/demo.yml` compiling with no contract exceptions.
4. `Schema alias`: compatibility key accepted at parse time and normalized into canonical compile input shape.
5. `Matcher policy`: deterministic rules that derive or require surface dispatch matchers.

## Boundaries and ownership

- Surface adapters:
  - own transport bind/match behavior only.
  - consume compiled dispatch plans; must not infer domain semantics.
- Kernel/domain runtime:
  - kernel continues to own sequencing/policy/orchestration.
  - domain/projection runtimes own semantic execution of compiled IR.
- Capability adapters:
  - remain external capability execution boundary; no ownership change.
- Host/platform adapters:
  - remain source of principal/time/identity/delegation contracts.

Must-not-cross constraints:

1. No adapter-local interpretation of unsupported spec constructs.
2. No second spec parser path outside canonical contract packages.
3. No runtime bypass around compiler-emitted IR for converged features.

## Contracts and typing

- Boundary schema authority:
  - `products/contracts/*` Zod schemas.
- Authoring format (for example, Zod-required):
  - canonical `GooiAppSpec` contract expanded for north-star constructs.
- Generated runtime artifact format (for example, normalized JSON Schema):
  - unchanged artifact families; added fields flow through existing deterministic manifest model.
- Canonical compiled artifact schema (required):
  - existing compiled bundle + IR artifacts remain canonical outputs.
- Artifact version field and hash policy:
  - bump spec contract major; artifact hashing remains deterministic stable-json policy.
- Deterministic serialization rules:
  - lexical ordering for set-like fields and deterministic diagnostics ordering.
- Allowed/disallowed schema features:
  - allow new explicit fields only; no broad `unknown` widening.
- Public contract shape:
  - one schema + one inferred type per section contract module.
- Invocation/result/error/signal/diagnostics envelope schemas:
  - unchanged in shape unless required by newly executable semantics; any additions are versioned.
- Envelope versioning strategy:
  - additive when possible; major bump if incompatible.
- Principal/auth context schema:
  - unchanged (`@gooi/host-contracts/principal`).
- Access evaluation order:
  - unchanged kernel-owned order.
- Error taxonomy:
  - compile diagnostics use existing typed diagnostic families; new codes added for convergence-specific validation.
- Compatibility policy:
  - clean break allowed; short migration aliases only where explicitly documented.
- Deprecation policy:
  - deprecated aliases removed after one milestone window.

## API and module plan

- Feature-oriented module layout:
  - `products/contracts/app-spec-contracts/src/spec/sections/*` for converged section schemas.
  - `products/authoring/spec-compiler/src/compile/*` for normalization and compile updates.
  - `products/runtime/surface-runtime/src/dispatch/*` for matcher policy parity.
  - `products/quality/conformance/test/*` for contract+runtime parity tests.
- Public APIs via `package.json` exports:
  - keep explicit subpath exports; add new subpaths only where contracts require.
- No barrel files:
  - enforced.
- Single entry per feature:
  - enforced for parse/compile/runtime adapter entrypoints.

## Package boundary classification

- Proposed location(s): `products/contracts/*`, `products/authoring/*`, `products/runtime/*`, `products/quality/*`
- Lane (if `products/*`): `contracts`, `authoring`, `runtime`, `quality`
- Why this boundary is correct:
  - convergence is primarily contract and compiler behavior; runtime consumes compiled outputs.
- Primary consumers (internal/external):
  - internal compiler/runtime/quality teams and external app authors using canonical spec.
- Coupling expectations (what it should and should not depend on):
  - contracts do not depend on runtime packages.
  - compiler depends on contracts; runtime depends on compiled artifacts/contracts.
- Why this is not a better fit in another boundary:
  - moving this into docs-only guidance would preserve drift and ambiguity.
- Promotion/demotion plan (if expected to move boundaries later):
  - no boundary promotion expected; this is a convergence hardening step.

## Delivery plan and rollout

Phase 1: Contract convergence and parser normalization

- Entry criteria:
  - RFC accepted.
- Exit criteria:
  - app spec contracts parse north-star constructs in `demo.yml`.
- Deliverables:
  - updated section schemas + normalization helpers + unit tests.

Phase 2: Compiler convergence

- Entry criteria:
  - Phase 1 complete.
- Exit criteria:
  - `compileEntrypointBundle({ spec: demo.yml })` succeeds.
- Deliverables:
  - projection/view/dispatch compile updates + deterministic diagnostics coverage.

Phase 3: Runtime and conformance parity

- Entry criteria:
  - Phase 2 complete.
- Exit criteria:
  - conformance suites pass on converged artifacts.
- Deliverables:
  - matcher policy parity, render/query refresh parity, and regression tests.

Execution-ordered issue slices:

1. `Slice 1` - Expand spec contracts for capabilities + views + projection alias vocabulary.
2. `Slice 2` - Add canonical normalization layer and deterministic alias mapping tests.
3. `Slice 3` - Upgrade projection compiler strategy inputs to normalized shape.
4. `Slice 4` - Upgrade view render IR compiler for `props`/`children`/`root_nodes`/`args`.
5. `Slice 5` - Define and implement web matcher policy defaults for dispatch compiler.
6. `Slice 6` - Compile `docs/demo.yml` in automated tests (golden + determinism).
7. `Slice 7` - Add conformance coverage for new executable constructs across runtime lanes.
8. `Slice 8` - Remove temporary compatibility aliases and lock final canonical vocabulary.

## Test strategy and acceptance criteria

Define:

- Unit, integration, and end-to-end coverage expectations:
  - contract parser tests for each new field family.
  - compiler tests for normalized shape and emitted IR.
  - runtime/conformance tests for dispatch/render/projection parity.
- Conformance tests (if contracts are cross-runtime):
  - surface transport consistency and dispatch/render conformance updated for new matcher behavior.
- Determinism/golden tests for artifacts and envelopes (if applicable):
  - demo compile golden artifact and hash determinism checks added.
- Definition of done:
  - `docs/demo.yml` compile-green, deterministic, and conformance-green with no fallback adapters.

## Operational readiness

Define:

- Observability and tracing:
  - convergence diagnostics include precise section paths and typed error codes.
- Failure handling and retries:
  - compile failures remain fail-fast; no silent fallback for unsupported constructs.
- Security requirements:
  - matcher normalization and expression parsing remain bounded and deterministic.
- Runbooks and incident readiness:
  - migration guide includes alias policy and removal date.
- Alert thresholds tied to service-level targets:
  - CI fails if canonical demo compile regresses or determinism breaks.

## Risks and mitigations

1. Risk: contract expansion introduces overly permissive schemas.
   - Mitigation: keep strict field allowlists and add invalid-shape tests.
2. Risk: alias normalization hides accidental typos.
   - Mitigation: aliases are explicit and finite; unknown keys remain hard errors.
3. Risk: dispatch matcher defaults create ambiguous routing.
   - Mitigation: deterministic specificity ordering and duplicate signature diagnostics.
4. Risk: convergence scope balloons.
   - Mitigation: execution slices and phase gates; no out-of-scope runtime rewrites.

## Alternatives considered

1. Keep `demo.yml` as non-executable narrative only.
   - Rejected: preserves two sources of truth.
2. Downscope `demo.yml` to fit current contracts.
   - Rejected: moves away from north-star language instead of converging platform.
3. Introduce parallel "north-star-only" contract package.
   - Rejected: institutionalizes drift.

## Open questions

1. Should convergence be a strict major bump with zero aliases, or a one-milestone alias window?
   - Owner: `Platform Architecture`
   - Due: `2026-03-05`
2. Should web matcher defaults be `intent`-based, `routeId`-based, or mandatory explicit matcher for mutations?
   - Owner: `Runtime Platform`
   - Due: `2026-03-05`

## Decision log

- `2026-03-01` - Opened RFC-0023 to converge canonical authoring contracts with north-star demo semantics.
