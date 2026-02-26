# @gooi/conformance

Provider conformance harness for RFC-0001 runtime behavior checks.

## Overview

`@gooi/conformance` runs a minimal conformance suite against a provider module and capability contract.
It verifies activation succeeds, invalid input is rejected, valid input succeeds, and effect enforcement behavior is preserved.

## Features

- Standardized conformance report shape
- Named RFC-0001 baseline checks
- Integration with `@gooi/provider-runtime`
- Optional binding-plan and lockfile enforcement during checks

## Installation

```bash
bun add @gooi/conformance
```

## Quick Start

```ts
import { runProviderConformance } from "@gooi/conformance";

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
- `ConformanceReport`
- `ConformanceCheckResult`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
