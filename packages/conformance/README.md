# @gooi/conformance

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Conformance harness for RFC-0001 provider runtime, RFC-0002 entrypoint runtime,
and RFC-0003 authoring intelligence behavior checks.

## Overview

`@gooi/conformance` runs conformance suites across three feature surfaces:
provider runtime checks, entrypoint runtime checks, and authoring intelligence checks.

## Features

- Provider runtime checks (`runProviderConformance`)
- Entrypoint runtime checks (`runEntrypointConformance`)
- Authoring checks (`runAuthoringConformance`)
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
import { runAuthoringConformance } from "@gooi/conformance/authoring";

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
- `runAuthoringConformance(input)`
- `ProviderConformanceReport`
- `EntrypointConformanceReport`
- `AuthoringConformanceReport`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
