# @gooi/conformance

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Conformance harness for RFC-0001 provider runtime and RFC-0002 entrypoint runtime behavior checks.

## Overview

`@gooi/conformance` runs conformance suites across two feature surfaces:
provider runtime checks and entrypoint runtime checks.

## Features

- Provider runtime checks (`runProviderConformance`)
- Entrypoint runtime checks (`runEntrypointConformance`)
- Named check IDs with machine-readable reports
- Optional binding-plan and lockfile enforcement for provider checks

## Installation

```bash
bun add @gooi/conformance
```

## Quick Start

```ts
import {
  runProviderConformance,
} from "@gooi/conformance/provider";
import { runEntrypointConformance } from "@gooi/conformance/entrypoint";

const report = await runProviderConformance({
  providerModule,
  hostApiVersion: "1.0.0",
  contract,
  validInput: { count: 1 },
  invalidInput: { count: 0 },
});

console.log(report.passed, report.checks);
```

## API Summary

- `runProviderConformance(input)`
- `runEntrypointConformance(input)`
- `ProviderConformanceReport`
- `EntrypointConformanceReport`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
