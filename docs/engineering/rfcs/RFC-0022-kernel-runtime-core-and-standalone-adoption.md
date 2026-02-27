# RFC-0022: Kernel Runtime Core Product Line and Canonical Consumption

## Metadata

- RFC: `RFC-0022`
- Title: `Kernel Runtime Core Product Line and Canonical Consumption`
- Status: `Draft`
- Owners: `Runtime Platform`, `Product Platform`
- Reviewers: `Developer Experience`, `Quality`, `Marketplace`
- Created: `2026-02-27`
- Updated: `2026-02-27`
- Target release: `Pre-Track-04 Gate`
- Related:
  - North star: [RFC-0007-north-star-platform-shape-and-progressive-dx-api.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0007-north-star-platform-shape-and-progressive-dx-api.md)
  - Entrypoint execution: [RFC-0002-entrypoint-execution-pipeline.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0002-entrypoint-execution-pipeline.md)
  - Host boundary: [RFC-0005-host-adapter-contracts-and-runtime-boundary-hardening.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0005-host-adapter-contracts-and-runtime-boundary-hardening.md)
  - Surface dispatch: [RFC-0011-route-and-surface-dispatch-contracts-web-http-cli-and-webhook.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0011-route-and-surface-dispatch-contracts-web-http-cli-and-webhook.md)
  - Render IR: [RFC-0012-view-render-ir-and-renderer-adapter-contract.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0012-view-render-ir-and-renderer-adapter-contract.md)
  - Demo model: [demo.yml](/Users/ngalluzzo/repos/gooi/docs/demo.yml)
  - Supersedes/Superseded by: `none`

## Problem and context

The platform repeatedly uses the term `kernel` in boundary and ownership language,
but there is no explicit kernel product boundary in the current package map.

Current gap:

1. Developers can consume runtime packages, but cannot target a clearly named
   standalone kernel product surface.
2. Track 04 work (dispatch/render) risks coupling directly to lane-specific
   runtime modules without an explicit core orchestration boundary.
3. North-star adoption modes describe progressive depth, but kernel-first
   adoption is not a first-class product contract.

## Goals

1. Define `kernel` as a first-class product line under `products/kernel/*`.
2. Define a standalone kernel consumption model for teams with custom surfaces/adapters.
3. Make kernel the only runtime orchestration authority and require other runtime packages to consume it.
4. Establish preconditions that must be met before Track 04 implementation starts.
5. Keep shared contracts in `products/contracts/*` and avoid reintroducing contract sprawl.

## Non-goals

1. Replacing domain/projection/guard runtime semantics with new behavior.
2. Rewriting all existing runtime packages in one step.
3. Defining UI framework behavior (covered by RFC-0012).
4. Defining marketplace control-plane features (covered by RFC-0016/RFC-0017/RFC-0018).

## Product outcomes and success metrics

Outcomes:

1. Developers can adopt Gooi runtime semantics via a standalone kernel API
   without adopting full platform lanes.
2. Surface dispatch and render work integrate with kernel contracts instead of
   introducing parallel orchestration behavior.
3. Runtime packages remain deterministic while consuming kernel-owned orchestration.

Metrics:

- Product metric(s):
  - `>= 80%` of Track 04 feature code references kernel APIs/contracts instead of direct lane-internal orchestration internals.
  - `>= 2` reference consumers run with standalone kernel mode (no full platform facade required).
- Reliability metric(s):
  - `0` runtime orchestration paths outside kernel ownership.
  - `100%` kernel invocations enforce typed boundary validation before execution.
- Developer experience metric(s):
  - Time to first standalone kernel execution from compiled artifact: `<= 30 minutes`.
  - Kernel API docs completeness for required host ports and invocation envelopes: `100%`.
- Explicit latency/availability target(s) with numeric thresholds:
  - Kernel orchestration overhead p95 `< 8ms` per invocation (excluding provider I/O).

## Proposal

Create a dedicated kernel product lane with a stable runtime-core API that
orchestrates invocation semantics and owns deterministic execution behavior.

Kernel is defined as:

1. policy and envelope orchestration boundary.
2. deterministic execution ordering boundary.
3. host/capability/runtime coordination boundary.
4. transport-agnostic core behavior surface.

### Deterministic runtime behavior rules

- Input normalization order:
  - bind -> defaults -> schema validation -> policy gate -> execution.
- Default precedence:
  - explicit input > declared default > validation failure.
- Unknown/null handling:
  - unknown keys fail typed validation; explicit `null` values are preserved.
- Stable ordering requirements:
  - diagnostics, effects, refresh signals, and traces emit deterministic ordering.
- Idempotency/replay behavior (for write paths):
  - replay behavior remains host-port and artifact-policy driven; kernel does not add implicit fallback behavior.

## Ubiquitous language

1. `Kernel`: transport-agnostic orchestration core that owns policy/order/envelope behavior.
2. `Standalone kernel mode`: consuming kernel APIs directly with compiled artifacts and host ports.
3. `Kernel portset`: required host/runtime dependency contract set passed into kernel APIs.
4. `Kernel invocation envelope`: canonical typed invoke/result/error envelope set for kernel entrypoints.
5. `Kernel consumption contract`: requirement that runtime/surface entrypoints call kernel orchestration APIs instead of reimplementing policy/order/envelope behavior.

## Boundaries and ownership

- Surface adapters:
  - own ingress/egress transport mapping only.
  - must call kernel APIs for execution semantics.
- Kernel/domain runtime:
  - kernel owns orchestration and policy sequencing.
  - domain/projection/guard runtimes own feature semantics and pure execution logic.
- Capability adapters:
  - own external side effects only.
- Host/platform adapters:
  - own environment primitives and policy data required by kernel orchestration.

Must-not-cross constraints:

1. Surface adapters must not implement kernel policy order or execution fallback behavior.
2. Kernel must not embed transport/framework-specific logic.
3. Kernel must not bypass typed contracts in `products/contracts/*`.
4. Kernel must not make marketplace control-plane decisions.

## Contracts and typing

- Boundary schema authority:
  - Zod schemas in `products/contracts/*`.
- Authoring format:
  - unchanged: app spec and compiled artifacts from authoring lane.
- Generated runtime artifact format:
  - unchanged: canonical compiled artifacts and lock/binding artifacts.
- Canonical compiled artifact schema (required):
  - kernel consumes existing compiled entrypoint/runtime artifacts from RFC-0008/RFC-0013 contracts.
- Artifact version field and hash policy:
  - unchanged; kernel validates and consumes existing version/hash contracts.
- Deterministic serialization rules:
  - unchanged for artifact contracts; kernel traces/envelopes must follow stable key/order policy.
- Allowed/disallowed schema features:
  - no broad `unknown` propagation in exported kernel-facing contracts.
- Public contract shape:
  - `createKernel(input) -> KernelRuntime`
  - `KernelRuntime.invoke(input) -> KernelInvokeResultEnvelope`
  - `KernelRuntime.trace(input) -> KernelTraceEnvelope`
- Invocation/result/error/signal/diagnostics envelope schemas:
  - kernel feature additions should live under existing runtime/surface contract families in `products/contracts/*`.
- Envelope versioning strategy:
  - semver literal contracts with explicit schema versions.
- Principal/auth context schema:
  - canonical host principal contracts remain source of truth.
- Access evaluation order:
  - kernel-owned, deterministic, and test-backed.
- Error taxonomy:
  - kernel-specific typed errors are explicit; no adapter-local ad hoc error classes.
- Compatibility policy:
  - breaking kernel contract changes require major version change.
- Deprecation policy:
  - deprecations require typed replacement paths and compatibility windows.

## API and module plan

Feature-oriented module layout:

1. `products/kernel/execution-kernel`
   - core orchestration runtime API.
2. `products/kernel/kernel-host-bridge`
   - host-portset normalization/validation helpers for standalone consumers.

Public APIs via `package.json` exports:

1. `@gooi/execution-kernel`
2. `@gooi/kernel-host-bridge`
3. no barrel exports; explicit feature paths only.

No barrel files:

1. use explicit `exports` subpaths only.

Single entry per feature:

1. one kernel factory entrypoint.
2. one invoke entrypoint.
3. one trace entrypoint.

## Package boundary classification

- Proposed location(s):
  - `products/kernel/*`
- Lane (if `products/*`):
  - `kernel`
- Why this boundary is correct:
  - kernel is the runtime core product line; runtime packages consume kernel for orchestration while keeping feature-semantic ownership.
- Primary consumers (internal/external):
  - internal runtime/surface teams and external teams embedding Gooi semantics into existing stacks.
- Coupling expectations:
  - depends on `products/contracts/*` and existing runtime contracts.
  - must not depend on marketplace service internals or authoring UX modules.
- Why this is not a better fit in another boundary:
  - keeping kernel implicit in `products/runtime/*` hides ownership and encourages orchestration drift.
- Promotion/demotion plan:
  - no demotion planned; kernel remains runtime-core ownership boundary.

## Delivery plan and rollout

Phase 1: Kernel boundary definition and package scaffolding

- Entry criteria:
  - RFC accepted.
- Exit criteria:
  - kernel lane and package scaffolds exist with typed API skeletons.
- Deliverables:
  - `products/kernel/*` scaffolds and contract references.

Phase 2: Runtime extraction and canonical kernel cutover

- Entry criteria:
  - Phase 1 complete.
- Exit criteria:
  - query/mutation runtime execution enters kernel-owned orchestration with no lane-local fallback path.
- Deliverables:
  - kernel-routed runtime execution and deterministic envelope/trace guarantees.

Phase 3: Track 04 enablement gate

- Entry criteria:
  - Phase 2 canonical kernel cutover accepted.
- Exit criteria:
  - Track 04 work is wired to kernel APIs/contracts instead of direct lane-internal orchestration coupling.
- Deliverables:
  - explicit Track 04 dependency update and implementation checklist.

## Test strategy and acceptance criteria

1. Unit:
   - kernel input normalization, policy order, and error taxonomy.
2. Integration:
   - standalone kernel invocation using compiled artifacts and host portset.
3. Conformance:
   - runtime packages prove kernel consumption and zero reintroduced orchestration logic.
4. Determinism/golden:
   - stable kernel result/error/trace envelopes for equivalent inputs.

Definition of done:

1. standalone kernel API is callable without full platform facade package.
2. runtime/surface execution paths do not bypass kernel orchestration.
3. Track 04 readiness checklist is satisfied.

## Operational readiness

1. Observability:
   - kernel-level invoke latency, validation failures, policy denials, replay collisions.
2. Failure handling:
   - typed kernel errors with stable codes and deterministic context fields.
3. Security requirements:
   - no bypass path around principal validation/access policy order.
4. Runbooks:
   - standalone kernel integration failure modes and recovery paths.
5. Alert thresholds:
   - kernel validation failures > `1%` for a release candidate build.

## Risks and mitigations

1. Risk: introducing a kernel lane duplicates runtime concepts.
   - Mitigation: strict ownership charter, lint boundary rules, and explicit runtime ownership docs.
2. Risk: extraction churn delays Track 04.
   - Mitigation: narrow scope to core orchestration surface first.
3. Risk: package sprawl in early phase.
   - Mitigation: keep kernel package count minimal and add only proven surfaces.

## Alternatives considered

1. Keep kernel implicit inside `products/runtime/*`.
   - Rejected: weak standalone adoption and unclear ownership.
2. Skip kernel and proceed directly with Track 04 runtime modules.
   - Rejected: likely coupling and rework risk in dispatch/render boundaries.
3. Introduce kernel as contracts-only package.
   - Rejected: does not satisfy standalone runtime behavior requirement.

## Open questions

1. Should `@gooi/execution-kernel` be the canonical package name, or should it use `@gooi/kernel-runtime` for consistency with existing naming?
   - Owner: Runtime Platform
   - Target decision date: `2026-03-02`
2. Should Track 03 roadmap stories move under the new kernel lane, or remain runtime lane stories with kernel acceptance expectations?
   - Owner: Product Platform
   - Target decision date: `2026-03-02`

## Decision log

- `2026-02-27` - Decided to frontload kernel as a dedicated product lane before Track 04 implementation work.
- `2026-02-27` - Decided kernel standalone consumption is a first-class product objective, not an incidental runtime detail.
- `2026-02-27` - Confirmed shared contracts remain under `products/contracts/*` and no new `packages/*-contracts` boundary is introduced for kernel work.
- `2026-02-27` - Decided kernel is the canonical runtime orchestration core; old-vs-new coexistence paths are out of scope.
