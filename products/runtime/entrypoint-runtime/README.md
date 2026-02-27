# @gooi/entrypoint-runtime

Composable runtime engine for executing compiled query and mutation entrypoints.

## Features

- Typed `HostPortSet` orchestration boundary (clock, identity, principal, delegation, optional replay)
- Deterministic fail-fast behavior when required host-port members are missing
- Policy-gate access checks derived from principal claims and compiled access rules
- Strict input validation before domain execution

## Quick Start

```ts
import { createEntrypointRuntime } from "@gooi/entrypoint-runtime";

const runtime = createEntrypointRuntime({
  bundle,
  domainRuntime,
  hostPorts: {
    clock,
    identity,
    principal,
    capabilityDelegation,
  },
});

const result = await runtime.run({
  binding,
  request,
  principal,
});
```

## Public API

- `@gooi/entrypoint-runtime` -> `createEntrypointRuntime(config)`, `runEntrypoint(input)`, `createDefaultHostPorts()`, `DomainRuntimePort`
