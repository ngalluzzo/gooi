# Platform Roadmap Sequences

This roadmap is sequence-based (no timelines) and execution-ordered.
Each sequence has its own document with epics, stories, and acceptance criteria.

## Sequence Order

1. [Sequence 01: Foundation Contracts and Host Boundaries](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/sequence-01-foundation-contracts-and-host-boundaries.md)
2. [Sequence 02: Full App Spec and Artifact Pipeline](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/sequence-02-full-app-spec-and-artifact-pipeline.md)
3. [Sequence 03: Runtime Kernel, Domain, and Projection Semantics](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/sequence-03-runtime-kernel-domain-and-projection-semantics.md)
4. [Sequence 04: Surface Dispatch and Rendering](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/sequence-04-surface-dispatch-and-rendering.md)
5. [Sequence 05: Authoring Intelligence and VS Code Surface](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/sequence-05-authoring-intelligence-and-vscode-surface.md)
6. [Sequence 06: Progressive DX Facades](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/sequence-06-progressive-dx-facades.md)
7. [Sequence 07: Marketplace Product (Control Plane, Resolution, Trust)](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/sequence-07-marketplace-product-control-plane-resolution-trust.md)
8. [Sequence 08: Cross-Lane Conformance and Release Gates](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/sequence-08-cross-lane-conformance-and-release-gates.md)

## Operating Rule

A sequence is complete only when all story acceptance criteria in that sequence are met.

## Reconciliation Rule

When RFC contracts change, roadmap sequences must be re-baselined before further execution.

Reconciliation steps:
1. Identify changed RFC contracts and decision-log lock-ins.
2. Map each changed contract to one owning sequence.
3. Add or update epics/stories so every new contract has explicit acceptance criteria.
4. Remove or rewrite stale stories that no longer match canonical language.
5. Validate sequence exits still imply full RFC contract coverage.

Current re-baseline focus:
1. Cross-host capability reachability (`local` vs `delegated`) and fail-hard `unreachable`.
2. Host delegation boundary (`HostCapabilityDelegationPort`) and artifact-sourced routes.
3. Compiler/deployment binding requirements for reachability.
4. Resolver reachability metadata and delegated-route descriptors.
5. Conformance parity gate for local vs delegated execution paths.

## Ownership Map

1. Sequence 01: Runtime Platform
2. Sequence 02: Product Platform (Compiler)
3. Sequence 03: Runtime Platform
4. Sequence 04: Runtime Platform (Surface Dispatch)
5. Sequence 05: Developer Experience
6. Sequence 06: Developer Experience + Runtime Platform
7. Sequence 07: Marketplace
8. Sequence 08: Quality

## Label Taxonomy

Use these labels when creating issues from sequence stories:
1. `roadmap`
2. `sequence-01` ... `sequence-08`
3. `rfc-alignment`
4. `determinism`
5. `reachability`
6. `delegation`
7. `marketplace`
8. `conformance`

## Issue Seeds

1. Rebaseline issue seeds: [issue-seeds-rebaseline-2026-02-26.md](/Users/ngalluzzo/repos/gooi/docs/engineering/roadmaps/issue-seeds-rebaseline-2026-02-26.md)
