# @gooi/entrypoint-runtime

Composable runtime engine for executing compiled query and mutation entrypoints.

## Features

- Typed `HostPortSet` orchestration boundary (clock, identity, principal, delegation, optional replay)
- Deterministic fail-fast behavior when required host-port members are missing
- Manifest activation mismatch errors include bundle/manifest artifact identities and typed diagnostics
- Canonical execution pipeline ordering: bind -> validate -> policy gate -> domain execution
- Policy-gate access checks flow through host principal validation/role derivation and compiled access rules
- Mutation idempotency replay and conflict detection over host replay-store contracts with configurable replay TTL
- Canonical refresh invalidation metadata on mutation results (`refreshTriggers` + deterministic `affectedQueryIds`)

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
