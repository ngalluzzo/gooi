# @gooi/domain-runtime

Deterministic domain runtime for action/capability semantics, session outcomes,
and simulation traceability.

## Features

- Deterministic action step input resolution (defaults, null handling, unknown-key enforcement)
- Capability input contract validation before invocation side effects
- Stable typed domain runtime error taxonomy
- Typed session outcome envelopes for success/failure paths
- Simulation mode support with deterministic trace envelopes
- Live/simulation mutation envelope comparability checks

## Quick Start

```ts
import { createDomainRuntime } from "@gooi/domain-runtime";

const domainRuntime = createDomainRuntime({
  mutationEntrypointActionMap: { submit_message: "guestbook.submit" },
  actions,
  capabilities,
});

const result = await domainRuntime.port.executeMutation({
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
