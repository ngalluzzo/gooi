# RFC-0001: Capability Contract and Provider Runtime Interface

## Metadata

- RFC: `RFC-0001`
- Title: `Capability Contract and Provider Runtime Interface`
- Status: `Draft`
- Owners: `Platform`
- Reviewers: `TBD`
- Created: `2026-02-26`
- Updated: `2026-02-26`
- Target release: `Foundation Milestone M1`
- Related:
  - Spec: [demo.yml](https://github.com/ngalluzzo/gooi/blob/main/docs/demo.yml)
  - Standards: [commit-and-tsdoc-standards.md](https://github.com/ngalluzzo/gooi/blob/main/docs/engineering/commit-and-tsdoc-standards.md)
  - RFC process: [README.md](https://github.com/ngalluzzo/gooi/blob/main/docs/engineering/rfcs/README.md)

## Problem and context

Gooi defines runtime-agnostic product behavior in one declarative spec, then
binds surfaces and capabilities at deployment/runtime.

The current spec is clear about intent, but the implementation foundation is
not yet formalized for:

1. Stable capability contracts.
2. Stable in-process provider runtime interface.
3. Deterministic compatibility and binding validation.

Without this RFC, feature work can drift into implicit contracts, leaked
boundaries, and non-portable behavior.

## Goals

1. Define an explicit typed contract model for capability ports and provider manifests.
2. Define an in-process host-provider runtime interface for dynamic imports.
3. Enforce boundary rules between surface adapters, kernel, capability adapters, and host adapters.
4. Establish deterministic compatibility checks and activation failures.
5. Establish this RFC format as the baseline for future product-engineering proposals.

## Non-goals

1. Shipping specific external providers (Terraform, GitHub Actions, Retool, etc.).
2. Defining cross-process transport (gRPC/JSON-RPC) for polyglot providers.
3. Implementing full projection/query/action runtime in this RFC.
4. Introducing OOP frameworks or class-based plugin APIs.

## Product outcomes and success metrics

Product outcomes:

1. Product and engineering share one contract vocabulary.
2. New features are built by composing capabilities, not bypassing contracts.

Success metrics:

1. `100%` of kernel capability calls validate against explicit typed contracts.
2. `100%` of activated providers pass compatibility handshake checks.
3. `0` undeclared side effects observed in conformance tests.
4. `100%` of public APIs exported via `package.json` exports (no barrel exports).

## Proposal

Introduce the first production foundation as two contract layers:

1. Capability contract model.
2. Provider runtime interface (in-process SPI via dynamic import).

This aligns with the spec direction in [demo.yml](https://github.com/ngalluzzo/gooi/blob/main/docs/demo.yml),
including explicit effects, failure modes, and deployment binding artifacts.

## Ubiquitous language

1. `Entrypoint`: Public query, mutation, or route.
2. `Surface adapter`: Maps native surface IO to entrypoint contract IO.
3. `Capability port`: Typed kernel-required operation contract.
4. `Capability adapter`: Provider implementation fulfilling a capability port.
5. `Host adapter`: Runtime environment dependency port (clock, trace, auth, module loading).
6. `Binding plan`: Environment-specific provider selection for required ports.
7. `Lockfile`: Deterministic provider versions/digests used by activation.

`Kernel adapter` is not a first-class term. Kernel is the orchestrator and policy
engine; it consumes host adapters and capability adapters.

## Boundaries and ownership

1. Surface adapters own transport mapping only.
2. Kernel owns policy, orchestration, effect enforcement, and execution semantics.
3. Capability adapters own external system execution for declared ports only.
4. Host adapters own runtime environment facilities.

Boundary constraints:

1. Surface adapters must not contain domain logic.
2. Capability adapters must not inspect surface-specific input shape.
3. Kernel must not directly depend on vendor SDKs.
4. Host adapters must not implement business policy.

## Contracts and typing

Canonical type strategy:

1. Contract authoring for all boundary IO is hard-required in Zod.
2. Normalized JSON Schema artifacts are generated from Zod and committed.
3. Canonical wire/interchange schema is the generated JSON Schema artifact (version pinned).
4. Runtime validation at invocation boundaries is required.

Boundary schema policy:

1. Boundary contracts must use a supported Zod profile only.
2. Unrepresentable or non-reversible constructs are disallowed at boundaries.
3. Contract compatibility is checked with schema hash plus semantic version.
4. Hand-authored JSON Schema for boundary contracts is not permitted.

Supported boundary profile (initial):

1. Allow structural validators and reversible codecs only.
2. Disallow unidirectional `transform` in boundary contracts.
3. Fail CI if Zod -> JSON Schema normalization is lossy or throws.

Compatibility rules:

1. Provider declares supported host API range.
2. Host rejects activation on incompatibility.
3. Breaking contract changes require major version bump.
4. Activation requires matching contract hash from generated artifacts.

Error taxonomy:

1. `validation_error`
2. `compatibility_error`
3. `activation_error`
4. `invocation_error`
5. `timeout_error`
6. `effect_violation_error`

### Contract sketch

```ts
export type CapabilityPort = {
  readonly id: string;
  readonly version: string;
  readonly inputSchema: JsonSchema;
  readonly outputSchema: JsonSchema;
  readonly errorSchema: JsonSchema;
  readonly declaredEffects: readonly EffectKind[];
};

export type ProviderManifest = {
  readonly providerId: string;
  readonly providerVersion: string;
  readonly hostApiRange: string;
  readonly capabilities: readonly {
    readonly portId: string;
    readonly portVersion: string;
  }[];
};
```

### Provider SPI sketch

```ts
export type ProviderModule = {
  readonly manifest: ProviderManifest;
  readonly activate: (ctx: ActivateContext) => Promise<ProviderInstance>;
};

export type ProviderInstance = {
  readonly invoke: (call: CapabilityCall) => Promise<CapabilityResult>;
  readonly deactivate: () => Promise<void>;
};
```

This is an API/SPI stability problem for in-process JS packages, not a binary
ABI problem.

## API and module plan

Modules are organized by product feature, not technical layer names.

Initial package targets:

1. `packages/contracts-capability`: capability and manifest contracts.
2. `packages/provider-runtime`: activation, compatibility, invocation boundary.
3. `packages/binding-plan`: binding plan and lockfile model plus validation.
4. `packages/conformance`: shared tests for provider compliance.

Public APIs:

1. Expose only stable entrypoints via package `exports`.
2. No barrel files.
3. Internal modules remain private and path-inaccessible.

## Delivery plan and rollout

Phase 1:

1. Land contract types and JSON Schema validators.
2. Land provider manifest schema and compatibility checker.
3. Land activation hard-fail path for incompatible providers.

Phase 2:

1. Land runtime invocation envelope and validation.
2. Land effect declaration checks on invocation results.
3. Land minimal conformance harness for one sample provider.

Phase 3:

1. Land binding plan and lockfile validation.
2. Enforce activation with resolved plan and lockfile.
3. Publish provider authoring guide and examples.

## Test strategy and acceptance criteria

Required tests:

1. Unit tests for schemas, compatibility, and error taxonomy.
2. Integration tests for activate -> invoke -> deactivate lifecycle.
3. Conformance tests with fixture providers and golden outputs.

Definition of done:

1. A provider cannot be invoked unless activation and compatibility pass.
2. Invalid input/output is rejected with typed errors.
3. Undeclared effects fail execution.
4. Public exports are explicit in `package.json`.

## Operational readiness

1. Every invocation carries trace context.
2. Activation and invocation produce structured logs.
3. Timeouts are enforced at capability boundary.
4. Failure modes map to documented typed errors.

## Risks and mitigations

1. Risk: contract drift between TypeScript and JSON Schema.
   Mitigation: hard-require Zod authoring and generate/pin schema artifacts in CI.
2. Risk: provider side effects escape declared effects.
   Mitigation: effect auditing and hard-fail enforcement in kernel.
3. Risk: boundary leakage from rapid feature delivery.
   Mitigation: lint rules and mandatory RFC review for boundary changes.

## Alternatives considered

1. Architecture-first package split.
   Rejected because it weakens product feature ownership.
2. Implicit provider contracts by convention.
   Rejected because production guarantees require explicit validation.
3. Barrel-based exports.
   Rejected due to accidental API surface growth and unclear ownership.

## Open questions

1. Should lockfile include provider checksum/signature requirements in M1 or M2?
2. Which JSON Schema draft is pinned for host-provider contracts in M1?
3. Should capability timeout policy live in binding plan or entrypoint spec?

## Decision log

- `2026-02-26` - RFC created as first merged PRD+RFC baseline.
- `2026-02-26` - Chosen adapter families: surface, capability, host.
- `2026-02-26` - Boundary IO contracts are Zod-authored and hard-required.
