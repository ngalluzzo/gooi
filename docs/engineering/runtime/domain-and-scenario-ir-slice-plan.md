# Domain and Scenario IR Slice Plan

## Purpose

Define the execution-ordered implementation slice that closes remaining
IR-first gaps after dispatch, view-render, and projection IR canonicalization.

## Scope

1. Domain Runtime IR:
   - compile `domain.actions` and `domain.flows` into `CompiledDomainRuntimeIR@1.0.0`.
2. Session IR:
   - compile `session.fields/defaults` into `CompiledSessionIR@1.0.0`.
3. Scenario IR:
   - compile `personas/scenarios` into `CompiledScenarioPlanSet@1.0.0` and emit as lane artifact.

## Out of scope

1. Marketplace resolver/ranking/trust behavior changes.
2. Surface transport matcher semantics.
3. Projection strategy semantics (already IR-backed).

## Architectural constraints

1. Runtime execution must consume compiled IR artifacts, not raw section payloads.
2. Runtime/kernel must not depend on authoring spec section internals.
3. Compatibility shims are temporary and must have explicit deletion criteria.

## Execution order

1. Contracts:
   - add `CompiledDomainRuntimeIR` and `CompiledSessionIR` contracts in
     existing contract packages (kernel/runtime semantic contract surface), not
     runtime modules.
   - reuse `@gooi/scenario-contracts` for scenario IR payload contracts.
2. Compiler:
   - add `compile-domain-runtime-ir.ts`.
   - add `compile-session-ir.ts`.
   - add `compile-scenario-ir.ts`.
   - wire outputs into `CompiledEntrypointBundle`, runtime lane artifacts, and manifest.
3. Runtime:
   - add IR-backed constructors for domain runtime (`createDomainRuntimeFromIR`).
   - route kernel semantic calls through IR-resolved plans.
4. Scenario runtime:
   - add compiler-to-runtime scenario artifact consumption path.
   - keep fixture plan set only as test fixture helper, not canonical runtime source.
5. Hardening:
   - add lint/conformance checks that fail when execution modules consume raw spec sections as source of truth.

## Acceptance checks

1. `bun run lint` passes with IR-boundary rules enabled.
2. `bun run typecheck` passes across all workspaces.
3. `bun run test` passes with:
   - deterministic golden bundle updates,
   - artifact-only runtime execution conformance,
   - compile-to-run scenario parity tests.

## Primary touchpoints

1. `products/contracts/app-spec-contracts/src/compiled/compiled.ts`
2. `products/contracts/kernel-contracts/src/semantic-engine/`
3. `products/contracts/scenario-contracts/src/plans/`
4. `products/authoring/spec-compiler/src/compile/compile-bundle.ts`
5. `products/authoring/spec-compiler/src/compile/compile-lane-artifacts.ts`
6. `products/runtime/domain-runtime/src/runtime/create-domain-runtime.ts`
7. `products/runtime/domain-runtime/src/runtime/runtime-internals.ts`
8. `products/quality/scenario-runtime/src/suite/run-scenario-suite.ts`
