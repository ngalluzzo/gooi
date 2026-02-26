# @gooi/binding-plan

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Typed deployment binding-plan and lockfile models for capability-to-provider resolution.

## Overview

`@gooi/binding-plan` defines and validates the deploy-time artifacts used by provider activation.
It ensures app/environment/host alignment and enables deterministic lookup of provider capability hashes.

## Features

- Binding plan schema for capability port -> provider mapping
- Lockfile schema for provider version/integrity/capability hashes
- Typed artifact parsing and validation helpers
- Lookup utilities for capability bindings and locked providers
- Alignment checks across plan and lockfile artifacts

## Installation

```bash
bun add @gooi/binding-plan
```

## Quick Start

```ts
import {
  parseBindingPlan,
  parseDeploymentLockfile,
  areBindingArtifactsAligned,
} from "@gooi/binding-plan";

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
