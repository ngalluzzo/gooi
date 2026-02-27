# Platform Product Roadmap

This roadmap is product-track-based (no timelines) and execution-ordered.
Each product track has its own document with epics, stories, and acceptance criteria.

## Track Order

1. [Track 01: Runtime Foundations and Host Boundaries](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/runtime-foundations-and-host-boundaries.md)
2. [Track 02: Full App Spec and Artifact Pipeline](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/app-spec-and-artifact-pipeline.md)
3. [Track 03: Runtime Kernel, Domain, Projections, and Guards](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/runtime-kernel-domain-projections-and-guards.md)
4. [Track 04: Surfaces, Dispatch, and Rendering](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/surfaces-dispatch-and-rendering.md)
5. [Track 05: Authoring Intelligence and VS Code Surface](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/authoring-intelligence-and-vscode-surface.md)
6. [Track 06: Progressive DX Facades](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/progressive-dx-facades.md)
7. [Track 07: Marketplace Control Plane, Resolution, and Trust](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/marketplace-control-plane-resolution-and-trust.md)
8. [Track 08: Conformance and Release Gates](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/conformance-and-release-gates.md)

## Operating Rule

A track is complete only when all story acceptance criteria in that track are met.

Additional gate:
1. Track 04 execution must not begin until [RFC-0022-kernel-runtime-core-and-standalone-adoption.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0022-kernel-runtime-core-and-standalone-adoption.md) preconditions are met.
2. Track 04 implementation must route query/mutation through the RFC-0023 execution spine before Track 04 stories are considered unblocked.

## Reconciliation Rule

When RFC contracts change, roadmap tracks must be re-baselined before further execution.

Reconciliation steps:
1. Identify changed RFC contracts and decision-log lock-ins.
2. Map each changed contract to one owning track.
3. Add or update epics/stories so every new contract has explicit acceptance criteria.
4. Remove or rewrite stale stories that no longer match canonical language.
5. Validate track exits still imply full RFC contract coverage.

Current re-baseline focus:
1. Cross-host capability reachability (`local` vs `delegated`) and fail-hard `unreachable`.
2. Host delegation boundary (`HostCapabilityDelegationPort`) and artifact-sourced routes.
3. Compiler/deployment binding requirements for reachability.
4. Resolver reachability metadata and delegated-route descriptors.
5. Conformance parity gate for local vs delegated execution paths.
6. Kernel product-lane frontload and standalone parity from RFC-0022.
7. Runtime package reset and orchestration centralization from RFC-0023.

## Ownership Map

1. Track 01: Runtime Platform
2. Track 02: Product Platform (Compiler)
3. Track 03: Runtime Platform
4. Track 04: Runtime Platform (Surface Dispatch)
5. Track 05: Developer Experience
6. Track 06: Developer Experience + Runtime Platform
7. Track 07: Marketplace
8. Track 08: Quality

## Label Taxonomy

Use these labels when creating issues from track stories:
1. `roadmap`
2. `product-runtime-foundations`
3. `product-spec-artifacts`
4. `product-runtime-kernel`
5. `product-surfaces-rendering`
6. `product-authoring-intelligence`
7. `product-dx-apis`
8. `product-marketplace`
9. `product-conformance-quality`
10. `rfc-alignment`
11. `determinism`
12. `reachability`
13. `delegation`
14. `marketplace`
15. `conformance`

## Issue Seeds

1. Rebaseline issues are tracked in `ngalluzzo/gooi` as `RB-001` through `RB-023` with `roadmap` label.
