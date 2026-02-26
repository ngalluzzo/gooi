# Track 07: Marketplace Control Plane, Resolution, and Trust

## RFC Alignment

- [RFC-0016](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0016-marketplace-product-architecture-control-plane-and-consumer-experience.md)
- [RFC-0017](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0017-marketplace-resolution-and-ranking-engine-at-10k-plus-scale.md)
- [RFC-0018](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-0018-marketplace-trust-certification-and-supply-chain-security.md)

## Epic 1: Marketplace Control Plane and Catalog Product

### Story 1.1: Implement listing lifecycle and publisher flows
Acceptance criteria:
1. Publish/update/deprecate lifecycle APIs are typed, deterministic, and auditable.
2. Namespace approval workflow is enforced for initial `1.0.0` onboarding policy.
3. Listing conflicts and policy failures return typed error codes.

### Story 1.2: Implement catalog plane and discovery snapshots
Acceptance criteria:
1. Search/detail/snapshot APIs are deterministic for fixed catalog state.
2. Catalog snapshot export is supported as a first-class enterprise/private mirror path.
3. Snapshot identities and hashes are stable and traceable.

### Story 1.3: Publish reachability and delegation descriptors
Acceptance criteria:
1. Catalog metadata includes execution-host compatibility for capability providers.
2. Catalog metadata includes delegation-route descriptors required by mixed-host resolution.
3. Metadata contracts are typed and versioned for resolver/runtime consumption.

### Story 1.4: Implement certification workflow integration
Acceptance criteria:
1. Certification state transitions are explicit and policy-governed.
2. Certification evidence artifacts are linked to listings deterministically.
3. Failed certification paths are diagnosable with typed reports.

## Epic 2: Resolution and Ranking Engine at Scale

### Story 2.1: Implement deterministic resolution pipeline stages
Acceptance criteria:
1. Candidate filtering, eligibility, scoring, and final selection are explicitly staged.
2. Equivalent inputs yield equivalent ordered outputs.
3. Resolution reports include explainability metadata.

### Story 2.2: Enforce policy-aware eligibility and scoring contracts
Acceptance criteria:
1. Global scoring profiles are enforced for `1.0.0` baseline.
2. Policy constraints (allow/deny, certification, trust posture) are first-class filters.
3. Eligibility failures are represented with typed diagnostics.

### Story 2.3: Implement explainability modes
Acceptance criteria:
1. Default mode returns summarized explainability.
2. Diagnostics mode returns full per-candidate score decomposition.
3. Explainability contracts are stable for CI and governance tooling.

### Story 2.4: Resolve local vs delegated candidates deterministically
Acceptance criteria:
1. Resolver classifies candidates by reachability mode (`local`/`delegated`) with deterministic ranking rules.
2. Delegated candidates include route metadata required for runtime invocation.
3. Missing feasible delegation paths produce typed `resolver_delegation_unavailable_error`/no-candidate outcomes.

## Epic 3: Trust, Certification, and Supply-Chain Security

### Story 3.1: Implement trust subject and attestation verification model
Acceptance criteria:
1. Identity, provenance, and signature claims are typed and verifiable.
2. Trust verification outcomes are deterministic and reportable.
3. Verification failures are fail-closed for certified/production paths.

### Story 3.2: Integrate trust policy with certification lifecycle
Acceptance criteria:
1. Certification eligibility consumes trust verification results.
2. Missing required trust signals block certification transitions.
3. Trust/certification outcomes are visible to resolution services via typed contracts.

### Story 3.3: Implement revocation propagation model
Acceptance criteria:
1. Revocation delivery uses push+pull hybrid propagation.
2. Resolver eligibility updates within defined freshness guarantees.
3. Revocation events are auditable and replay-safe.

## Sequence Exit Criteria

1. Marketplace operates as a product control plane, not only a package source.
2. Resolution and trust are deterministic, explainable, and policy-enforceable.
3. Catalog, certification, and revocation states are consumable across product lanes.
4. Mixed-host reachability metadata is publishable and resolver-actionable.
