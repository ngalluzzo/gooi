# @gooi/provider-runtime

In-process provider activation and invocation runtime with compatibility, validation, and effect enforcement.

## Overview

`@gooi/provider-runtime` executes provider modules loaded via dynamic import.
It validates host compatibility, enforces binding-plan and lockfile constraints, validates IO payloads against capability contracts, and rejects undeclared effects.

## Features

- Provider activation compatibility checks (`hostApiRange` vs host version)
- Hard-fail activation when binding/lockfile checks fail
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
import { activateProvider, invokeCapability } from "@gooi/provider-runtime";

const activated = await activateProvider({
  providerModule,
  hostApiVersion: "1.0.0",
  contracts: [capabilityContract],
});

if (!activated.ok) {
  throw new Error(activated.error.message);
}

const result = await invokeCapability(activated.value, {
  portId: capabilityContract.id,
  portVersion: capabilityContract.version,
  input: { count: 2 },
  principal: { subject: "user_1", roles: ["authenticated"] },
  ctx: { id: "inv_1", traceId: "trace_1", now: new Date().toISOString() },
});
```

## API Summary

- `activateProvider(input)`
- `invokeCapability(activated, call)`
- `deactivateProvider(activated)`
- `isHostApiCompatible(range, version)`
- `ensureObservedEffectsDeclared(declared, observed)`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
