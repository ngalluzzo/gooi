# RFC-0006: Foundational Host Adapter Provider Model and Memory Reference Package

## Metadata

- RFC: `RFC-0006`
- Title: `Foundational Host Adapter Provider Model and Memory Reference Package`
- Status: `Implemented`
- Owners: `Platform`
- Reviewers: `Runtime Platform`, `Developer Experience`, `Marketplace`
- Created: `2026-02-26`
- Updated: `2026-02-26`
- Target release: `Host Runtime Milestone M6`
- Related:
  - Foundation: [RFC-0001-capability-contract-and-provider-runtime-interface.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0001-capability-contract-and-provider-runtime-interface.md)
  - Execution: [RFC-0002-entrypoint-execution-pipeline.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0002-entrypoint-execution-pipeline.md)
  - Host boundary hardening: [RFC-0005-host-adapter-contracts-and-runtime-boundary-hardening.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0005-host-adapter-contracts-and-runtime-boundary-hardening.md)
  - Marketplace architecture: [RFC-0016-marketplace-product-architecture-control-plane-and-consumer-experience.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0016-marketplace-product-architecture-control-plane-and-consumer-experience.md)
  - Marketplace resolution: [RFC-0017-marketplace-resolution-and-ranking-engine-at-10k-plus-scale.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0017-marketplace-resolution-and-ranking-engine-at-10k-plus-scale.md)
  - Marketplace trust: [RFC-0018-marketplace-trust-certification-and-supply-chain-security.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0018-marketplace-trust-certification-and-supply-chain-security.md)
  - Host contracts package: [package.json](/Users/ngalluzzo/repos/gooi/products/contracts/host-contracts/package.json)
  - Marketplace memory package: [package.json](/Users/ngalluzzo/repos/gooi/products/marketplace/memory/package.json)
  - Entrypoint runtime host API: [host.ts](/Users/ngalluzzo/repos/gooi/products/runtime/entrypoint-runtime/src/host.ts)
  - Provider runtime host API: [host.ts](/Users/ngalluzzo/repos/gooi/products/runtime/provider-runtime/src/host.ts)
  - Conformance host/replay features: [package.json](/Users/ngalluzzo/repos/gooi/products/quality/conformance/package.json)

## Problem and context

The original draft framed marketplace provider productization as replay-store only.
Implementation moved to a broader pattern: all core host adapters now follow one
provider-authoring model.

Scope clarification:

1. RFC-0006 defines the foundational host/provider contract pattern and reference implementations.
2. Marketplace product control-plane scope (catalog lifecycle, resolution/ranking, trust/certification operations) now lives in RFC-0016/RFC-0017/RFC-0018.

What needed to be made explicit:

1. Host contracts must be the public contract authority and provider-definition
   entrypoint for every host adapter feature.
2. Runtime packages must consume host ports, not own concrete implementations.
3. Marketplace packages must be the canonical location for concrete adapters.
4. Conformance must validate host adapter behavior via contract-level APIs.
5. Feature colocation and single export per feature must apply uniformly.

Without this, contributors get inconsistent signals and duplicate boilerplate per
adapter type.

## Goals

1. Define one generic host-provider product pattern that applies to all host
   adapters, not just replay-store.
2. Keep contracts in `@gooi/host-contracts/*` and implementations in
   `@gooi-marketplace/memory/*` (and future marketplace packages).
3. Provide feature-local provider constructors for each host adapter contract.
4. Keep runtime host integration clean and explicit (`@gooi/entrypoint-runtime/host`,
   `@gooi/provider-runtime/host`).
5. Preserve strict boundary rules: no legacy shims, no barrel re-exports.
6. Validate behavior through conformance features in `@gooi/conformance`.

## Non-goals

1. Marketplace control-plane product scope (catalog lifecycle, resolution/ranking, trust/certification operations).
2. Dynamic marketplace install/registry protocol.
3. Cross-language runtime transport for providers.
4. Re-architecting capability-provider contracts in this RFC.

## Product outcomes and success metrics

- Product metric(s):
  - Contributor can implement any host adapter by using one feature entrypoint
    from `@gooi/host-contracts/*` and one feature entrypoint from
    `@gooi-marketplace/memory/*`.
  - Runtime and tests consume host adapters only via public package exports.
- Reliability metric(s):
  - `100%` CI host conformance and replay-store conformance pass on default branch.
  - `100%` idempotent replay behavior routes through `HostReplayStorePort`.
- Developer experience metric(s):
  - Time-to-first-provider for one host adapter `<= 30 minutes`.
  - Provider setup boilerplate `<= 80` lines before implementation logic.
- Explicit latency/availability target(s) with numeric thresholds:
  - In-memory reference provider operations (`clock`, `identity`, `principal`,
    `replay-store`, `activation-policy`, `module-loader`, `module-integrity`,
    `capability-delegation`) remain local in-process and deterministic in CI.
  - Conformance suite success rate `100%` on default branch.

## Proposal

Adopt one generic, feature-local provider model for host adapters.

Current host adapter feature set:

1. `clock`
2. `identity`
3. `principal`
4. `replay-store`
5. `activation-policy`
6. `module-loader`
7. `module-integrity`
8. `capability-delegation`

For each feature:

1. `@gooi/host-contracts/<feature>` exports:
   - Port contract interface.
   - Optional `create...Port` helper for callback-based construction.
   - `createHost...Provider` manifest + factory constructor.
2. `@gooi-marketplace/memory/<feature>` exports:
   - `createMemory...Port`.
   - `memory...Provider` built via host-contract constructor.
3. Runtime consumes ports through host APIs:
   - `@gooi/entrypoint-runtime/host`
   - `@gooi/provider-runtime/host`
4. Conformance consumes contracts, not runtime internals:
   - `@gooi/conformance/host`
   - `@gooi/conformance/replay-store`

Deterministic runtime behavior rules:

- Input normalization order:
  - unchanged from RFC-0002 in entrypoint runtime.
- Default precedence:
  - unchanged from RFC-0002.
- Unknown/null handling:
  - unchanged from RFC-0002.
- Stable ordering requirements:
  - unchanged from RFC-0002 (stable envelope/effect ordering).
- Idempotency/replay behavior (for write paths):
  - unchanged; replay semantics remain governed by `HostReplayStorePort`.

### Provider-author API sketch

```ts
import { createHostClockProvider } from "@gooi/host-contracts/clock";

export const acmeClockProvider = createHostClockProvider({
  manifest: {
    providerId: "acme.clock",
    providerVersion: "1.0.0",
    hostApiRange: "^1.0.0",
  },
  createPort: () => ({
    nowIso: () => new Date().toISOString(),
  }),
});
```

```ts
import { runReplayStoreConformance } from "@gooi/conformance/replay-store";
import { memoryReplayStoreProvider } from "@gooi-marketplace/memory/replay-store";

const report = await runReplayStoreConformance({
  createPort: memoryReplayStoreProvider.createPort,
});
```

## Ubiquitous language

1. `Host adapter feature`: One host contract slice (for example `clock`).
2. `Host provider definition`: Manifest + `createPort` contract object.
3. `Host provider implementation`: Concrete adapter code in marketplace package.
4. `Reference provider`: First-party implementation used by tests/examples.
5. `Feature entrypoint`: One explicit `package.json` export for one feature.

## Boundaries and ownership

- Surface adapters:
  - Own transport mapping only.
- Kernel/domain runtime:
  - Own orchestration and policy; consume host ports.
- Capability adapters:
  - Own external side effects behind capability contracts.
- Host/platform adapters:
  - `@gooi/host-contracts/*` owns contracts + provider constructors.
  - `products/marketplace/*` owns concrete implementations.

Must-not-cross constraints:

1. Runtime packages must not contain concrete marketplace host adapters.
2. `@gooi/host-contracts` must not ship concrete provider implementations.
3. Marketplace packages must depend on contracts, not runtime internals.
4. Conformance features must validate contract behavior, not private internals.
5. No barrel re-export chains; feature entrypoints are explicit and direct.

## Contracts and typing

- Boundary schema authority:
  - `@gooi/host-contracts/*` is canonical.
- Authoring format:
  - TypeScript contracts; Zod where runtime validation is required (for example
    principal parsing).
- Generated runtime artifact format:
  - unchanged from RFC-0002.
- Canonical compiled artifact schema (required):
  - unchanged.
- Artifact version field and hash policy:
  - unchanged.
- Deterministic serialization rules:
  - unchanged; replay hash behavior still stable-json based.
- Allowed/disallowed schema features:
  - unchanged from RFC-0001 profile.
- Public contract shape:
  - per-feature port + provider constructor exported from host-contracts.
- Invocation/result/error/signal/diagnostics envelope schemas:
  - unchanged.
- Envelope versioning strategy:
  - unchanged (`1.0.0`).
- Principal/auth context schema:
  - defined in `@gooi/host-contracts/principal`.
- Access evaluation order:
  - unchanged in entrypoint runtime.
- Error taxonomy:
  - unchanged for runtime envelopes; host adapters use `HostPortResult`.
- Compatibility policy:
  - every host provider manifest declares `hostApiRange`.
- Deprecation policy:
  - clean break; removed legacy runtime-local implementations instead of shims.

## API and module plan

- Feature-oriented module layout:
  - `products/contracts/host-contracts/src/<feature>/<feature>.ts`
  - `products/marketplace/memory/src/<feature>/<feature>.ts`
  - `products/runtime/entrypoint-runtime/src/{engine.ts,host.ts,domain.ts}`
  - `products/runtime/provider-runtime/src/{engine.ts,host.ts}`
  - `products/quality/conformance/src/*-conformance/*`
- Public APIs via `package.json` exports:
  - `@gooi/host-contracts/{clock,identity,principal,replay,activation-policy,module-loader,module-integrity,delegation,result}`
  - `@gooi-marketplace/memory/{clock,identity,principal,replay-store,activation-policy,module-loader,module-integrity,delegation}`
  - `@gooi/entrypoint-runtime/{.,host,domain}`
  - `@gooi/provider-runtime/{.,host}`
  - `@gooi/conformance/{provider,entrypoint,authoring,host,replay-store,...contracts}`
- No barrel files:
  - each exported feature points directly to one file.
- Single entry per feature:
  - every feature has one package export path.

## Package boundary classification

- Proposed location(s):
  - `products/contracts/host-contracts`
  - `products/runtime/entrypoint-runtime`
  - `products/runtime/provider-runtime`
  - `products/quality/conformance`
  - `products/marketplace/memory`
- Lane (if `products/*`):
  - `runtime` and `quality`.
- Why this boundary is correct:
  - contracts are reusable primitives, runtime is orchestration, quality is
    conformance, marketplace is implementations.
- Primary consumers (internal/external):
  - internal runtime teams, test/conformance suites, marketplace contributors.
- Coupling expectations:
  - contracts -> no runtime internals.
  - marketplace -> contracts (+ conformance in dev/test), no runtime internals.
  - runtime -> contracts, not marketplace internals.
- Why this is not a better fit in another boundary:
  - top-level shared SDK package would duplicate feature ownership and obscure
    boundaries.
- Promotion/demotion plan:
  - if truly cross-feature provider tooling emerges, propose a dedicated package
    in a future RFC with narrow scope.

## Delivery plan and rollout

Phase 1: Host contracts feature decomposition and provider constructors

- Entry criteria:
  - RFC-0005 boundary rules accepted.
- Exit criteria:
  - all core host features have contract + provider constructor surfaces.
- Deliverables:
  - feature files under `products/contracts/host-contracts/src/*`.

Phase 2: Runtime host API cleanup

- Entry criteria:
  - Phase 1 merged.
- Exit criteria:
  - runtime packages consume host contracts through explicit host feature APIs.
- Deliverables:
  - `entrypoint-runtime` and `provider-runtime` host entrypoints.

Phase 3: Marketplace memory reference implementations

- Entry criteria:
  - Phase 2 merged.
- Exit criteria:
  - one reference implementation per core host feature in `products/marketplace/memory`.
- Deliverables:
  - `clock`, `identity`, `principal`, `replay-store`, `activation-policy`,
    `module-loader`, `module-integrity`, `delegation` features.

Phase 4: Conformance integration

- Entry criteria:
  - Phase 3 merged.
- Exit criteria:
  - host and replay-store conformance suites validate implementations.
- Deliverables:
  - `@gooi/conformance/host`
  - `@gooi/conformance/replay-store`

## Test strategy and acceptance criteria

- Unit, integration, and end-to-end coverage expectations:
  - unit tests per host-contract feature constructor and reference provider.
  - integration tests for runtime host wiring.
- Conformance tests:
  - host and replay-store conformance runners in `@gooi/conformance`.
- Determinism/golden tests:
  - replay-store deterministic outcomes and stable report ordering.
- Definition of done:
  - runtime does not contain concrete host adapter implementations.
  - marketplace memory providers pass conformance.
  - only public feature exports are required to consume contracts/providers.

## Operational readiness

- Observability and tracing:
  - host adapters expose typed error payloads (`HostPortResult`) where required.
- Failure handling and retries:
  - provider/runtime boundaries return typed failures; no hidden runtime globals.
- Security requirements:
  - principal and replay scopes remain explicit contract data, never implicit globals.
- Runbooks and incident readiness:
  - conformance report provides first diagnostic checkpoint for adapter regressions.
- Alert thresholds tied to service-level targets:
  - replay conflict and adapter failure thresholds remain governed by runtime
    observability standards from RFC-0002/RFC-0005.

## Risks and mitigations

1. Risk: adapter feature APIs drift over time.
   Mitigation: enforce one-feature-per-export and conformance updates in lockstep.
2. Risk: contributors bypass conformance and ship partial implementations.
   Mitigation: publish checklist requires conformance report.
3. Risk: runtime teams reintroduce local convenience implementations.
   Mitigation: boundary rule that concrete adapters live only in `products/marketplace/*`.

## Alternatives considered

1. Keep replay-store-only scope for RFC-0006.
   Rejected: implementation and product surface are already broader.
2. Create a top-level `sdk` product line for host providers.
   Rejected: duplicates feature ownership and increases boundary confusion.
3. Keep concrete memory adapters in runtime packages.
   Rejected: incorrect ownership and weak marketplace signal.

## Open questions

None.

## Decision log

- `2026-02-26` - Scope broadened from replay-store only to generic host adapter
  provider model.
- `2026-02-26` - Chosen pattern: feature-local provider constructors in
  `@gooi/host-contracts/*` with concrete implementations in `products/marketplace/*`.
- `2026-02-26` - Chosen clean-break rule: no legacy runtime-local host adapter
  implementations.
- `2026-02-26` - Scope clarified: RFC-0006 is foundational host/provider architecture; marketplace product control-plane scope is tracked by RFC-0016/RFC-0017/RFC-0018.
- `2026-02-26` - Resolved host conformance granularity: keep `host` aggregate and `replay-store` as required suites; add feature-specific suites only when contract complexity warrants dedicated coverage.
- `2026-02-26` - Resolved provider listing distribution metadata ownership: evolve listing metadata in marketplace product contracts under RFC-0016, not in RFC-0006 host-provider contracts.
