# @gooi/binding

Binding plan parsing and alignment checks for deploy-time capability-to-provider resolution.

## Overview

`@gooi/binding` provides the binding-plan contract and helpers used to validate deployment lockfiles against compiled binding artifacts.

## Feature Entry Point

- `@gooi/binding/binding-plan`

## Installation

```bash
bun add @gooi/binding
```

## Quick Start

```ts
import {
  areBindingArtifactsAligned,
  parseBindingPlan,
  parseDeploymentLockfile,
} from "@gooi/binding/binding-plan";

const plan = parseBindingPlan(rawPlan);
const lockfile = parseDeploymentLockfile(rawLockfile);

if (!areBindingArtifactsAligned(plan, lockfile)) {
  throw new Error("Binding artifacts are not aligned.");
}
```

## API Summary

- `parseBindingPlan(value)`
- `parseDeploymentLockfile(value)`
- `getCapabilityBinding(plan, portId, portVersion)`
- `getLockedProvider(lockfile, providerId, providerVersion)`
- `providerHasLockedCapability(provider, portId, portVersion, contractHash)`
- `areBindingArtifactsAligned(plan, lockfile)`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
