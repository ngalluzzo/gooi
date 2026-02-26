# @gooi/host-contracts

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Typed host port contracts shared by runtime packages.

## Overview

`@gooi/host-contracts` defines infrastructure-facing ports used by runtime
orchestration code: clock, identity, activation policy, and module loading.

## Features

- Typed host-port result model (`HostPortResult`)
- Clock and identity contracts
- Activation-alignment policy contract
- Module loading contract
- System-backed permanent host adapter implementations

## Installation

```bash
bun add @gooi/host-contracts
```

## Quick Start

```ts
import {
	createStrictActivationPolicyPort,
	createSystemClockPort,
	createSystemIdentityPort,
} from "@gooi/host-contracts";

const clock = createSystemClockPort();
const identity = createSystemIdentityPort();
const activationPolicy = createStrictActivationPolicyPort();

const alignment = activationPolicy.assertHostVersionAligned({
	runtimeHostApiVersion: "1.0.0",
	bindingPlanHostApiVersion: "1.0.0",
	lockfileHostApiVersion: "1.0.0",
});
```

## API Summary

- `HostPortResult`
- `HostClockPort`
- `HostIdentityPort`
- `HostActivationPolicyPort`
- `HostModuleLoaderPort`
- `createSystemClockPort()`
- `createSystemIdentityPort()`
- `createStrictActivationPolicyPort()`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
