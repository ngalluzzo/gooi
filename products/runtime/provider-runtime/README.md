# @gooi/provider-runtime

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

In-process provider activation and invocation runtime with compatibility, validation, and effect enforcement.

## Overview

`@gooi/provider-runtime` executes provider modules loaded via dynamic import.
It validates host compatibility, enforces binding-plan and lockfile constraints, validates IO payloads against capability contracts, and rejects undeclared effects.

## Features

- Provider activation compatibility checks (`hostApiRange` vs host version)
- Explicit provider runtime host-port set contract checks (`clock`, `activationPolicy`, `capabilityDelegation`)
- Deterministic fail-fast activation errors when required host-port members are missing
- Hard-fail activation when binding/lockfile checks fail
- Deterministic reachability execution semantics (`local` / `delegated` / `capability_unreachable_error`)
- Delegated invocation path uses explicit `delegateRouteId` from deployment artifacts
- No implicit local fallback when delegated invocation fails
- Typed invocation envelope (`principal`, `ctx`, `input`)
- Input/output/error payload validation via contract Zod schemas
- Observed-effect enforcement against declared capability effects
- Typed runtime error taxonomy

## Installation

```bash
bun add @gooi/provider-runtime
```

## Quick Start

```ts
import { createProviderRuntime } from "@gooi/provider-runtime";

const runtime = createProviderRuntime({
  hostApiVersion: "1.0.0",
  contracts: [capabilityContract],
});

const activated = await runtime.activate({ providerModule });

if (!activated.ok) {
  throw new Error(activated.error.message);
}

const result = await runtime.invoke(activated.value, {
  portId: capabilityContract.id,
  portVersion: capabilityContract.version,
  input: { count: 2 },
  principal: { subject: "user_1", roles: ["authenticated"] },
  ctx: { id: "inv_1", traceId: "trace_1", now: new Date().toISOString() },
});

await runtime.deactivate(activated.value);
```

## API Summary

- `createProviderRuntime(config)`
- `runtime.activate(input)`
- `runtime.invoke(activated, call)`
- `runtime.deactivate(activated)`
- `runtime.run(input)`
- `activateProvider(input)`
- `invokeCapability(activated, call)`
- `deactivateProvider(activated)`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
