# @gooi/binding

Binding plan parsing and alignment checks for deploy-time capability-to-provider resolution.

## Overview

`@gooi/binding` provides the binding-plan contract and helpers used to validate deployment lockfiles against compiled binding artifacts.

Lockfile provider entries require `integrity` in canonical checksum format:

- `sha256:<64 lowercase hex chars>`

This checksum requirement is enforced during lockfile parsing and again at provider activation boundaries.

## Feature Entry Point

- `@gooi/binding/binding-plan`
- `@gooi/binding/binding-plan/contracts`
- `@gooi/binding/binding-plan/parse`
- `@gooi/binding/binding-plan/lookup`
- `@gooi/binding/lockfile/contracts`
- `@gooi/binding/lockfile/parse`
- `@gooi/binding/lockfile/lookup`
- `@gooi/binding/lockfile/integrity`
- `@gooi/binding/reachability/contracts`
- `@gooi/binding/reachability/policy`
- `@gooi/binding/artifact-alignment/policy`

## Installation

```bash
bun add @gooi/binding
```

## Quick Start

```ts
import {
	areBindingArtifactsAligned,
	getCapabilityBindingResolution,
	parseBindingPlan,
	parseDeploymentLockfile,
} from "@gooi/binding/binding-plan";

const plan = parseBindingPlan(rawPlan);
const lockfile = parseDeploymentLockfile(rawLockfile);

if (!areBindingArtifactsAligned(plan, lockfile)) {
  throw new Error("Binding artifacts are not aligned.");
}

const resolution = getCapabilityBindingResolution(plan, "ids.generate", "1.0.0");
if (resolution?.mode === "unreachable") {
  throw new Error("Capability is unreachable on this deployment host.");
}
```

## API Summary

Compatibility facade (`@gooi/binding/binding-plan`):

- `parseBindingPlan(value)`
- `parseDeploymentLockfile(value)`
- `getCapabilityBinding(plan, portId, portVersion)`
- `getCapabilityBindingResolution(plan, portId, portVersion)`
- `isCapabilityReachable(resolution)`
- `capabilityReachabilityModeSchema`
- `executionHostSchema`
- `getLockedProvider(lockfile, providerId, providerVersion)`
- `providerHasLockedCapability(provider, portId, portVersion, contractHash)`
- `isLockedProviderIntegrity(integrity)`
- `areBindingArtifactsAligned(plan, lockfile)`

Feature modules:

- `binding-plan/contracts`: binding plan schemas and types
- `binding-plan/parse`: `parseBindingPlan`
- `binding-plan/lookup`: capability binding lookup helpers
- `lockfile/contracts`: lockfile schemas and types
- `lockfile/parse`: `parseDeploymentLockfile`
- `lockfile/lookup`: locked provider lookup helpers
- `lockfile/integrity`: checksum policy helper
- `reachability/contracts`: execution host + reachability contracts
- `reachability/policy`: `isCapabilityReachable`
- `artifact-alignment/policy`: plan/lockfile alignment policy

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
