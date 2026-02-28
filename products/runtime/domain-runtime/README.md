# @gooi/domain-runtime

Deterministic domain runtime for action/capability semantics, session outcomes,
and simulation traceability.

## Features

- Deterministic action step input resolution (defaults, null handling, unknown-key enforcement)
- Capability input contract validation before invocation side effects
- Stable typed domain runtime error taxonomy
- Canonical guard boundary enforcement for collection invariants, action guards, signal guards, and flow guards
- Guard-boundary traces/errors carry typed violations and diagnostics for deterministic policy analysis
- Typed session outcome envelopes for success/failure paths
- Simulation mode support with deterministic trace envelopes
- Canonical query-path failure envelopes aligned with typed mutation failure contracts
- Live/simulation mutation envelope comparability checks

## Quick Start

```ts
import { createDomainRuntime } from "@gooi/domain-runtime";

const domainRuntime = createDomainRuntime({
  domainRuntimeIR,
  sessionIR,
  capabilities,
});

const result = await domainRuntime.executeMutation({
  entrypoint,
  kind: "mutation",
  input,
  principal,
  ctx: {
    invocationId: "inv_1",
    traceId: "trace_1",
    now: "2026-02-27T00:00:00.000Z",
  },
});
```

## Public API

- `createDomainRuntime(input)`
- `DomainRuntime`
- `@gooi/domain-runtime/conformance` -> `createDomainRuntimeConformanceHarness(input)`
