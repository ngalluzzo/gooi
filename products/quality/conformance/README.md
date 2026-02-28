# @gooi/conformance

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Conformance harness for RFC-0001 provider runtime, RFC-0002 entrypoint runtime,
RFC-0003 authoring intelligence behavior checks, RFC-0010 projection runtime
parity checks, RFC-0019 guard contracts, and RFC-0020 scenario runtime behavior.

## Overview

`@gooi/conformance` runs conformance suites across runtime and authoring
surfaces: provider runtime checks, entrypoint runtime checks, replay-store host
provider checks, authoring intelligence checks, guard checks, and scenario checks.

## Features

- Provider runtime checks (`runProviderConformance`)
- Entrypoint runtime checks (`runEntrypointConformance`)
- Host runtime checks (`runHostConformance`)
- Host runtime checks include success and fail-fast missing-host-port coverage
- Replay-store host provider checks (`runReplayStoreConformance`)
- Default test runner baseline includes host + replay-store conformance suites
- Authoring checks (`runAuthoringConformance`)
- Cross-client readiness baseline checks (`runCrossClientReadinessConformance`)
- Reachability parity checks (`runReachabilityParitySuite`)
- Projection/domain parity checks (`runProjectionConformance`)
- Projection conformance includes history contract gates, rebuild workflow recovery,
  and signal migration-chain enforcement checks
- Dispatch-to-render pipeline checks (`runDispatchRenderConformance`)
- Surface extension readiness checks (`runSurfaceExtensionConformance`)
- Guard matrix and semantic policy checks (`runGuardConformance`)
- Scenario runtime behavior and lockfile determinism checks (`runScenarioConformance`)
- Shared host-port check helpers (`buildHostPortConformanceCheck`)
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
import { runHostConformance } from "@gooi/conformance/host";
import { runReplayStoreConformance } from "@gooi/conformance/replay-store";
import { runAuthoringConformance } from "@gooi/conformance/authoring";
import { runReachabilityParitySuite } from "@gooi/conformance/reachability-parity";
import { runProjectionConformance } from "@gooi/conformance/projection";
import { runGuardConformance } from "@gooi/conformance/guard";
import { runScenarioConformance } from "@gooi/conformance/scenario";

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
- `runHostConformance(input)`
- `runReplayStoreConformance(input)`
- `runAuthoringConformance(input)`
- `runCrossClientReadinessConformance(input)`
- `runReachabilityParitySuite(input)`
- `runProjectionConformance(input)`
- `runDispatchRenderConformance(input)`
- `runSurfaceExtensionConformance(input)`
- `runGuardConformance(input)`
- `runScenarioConformance(input)`
- `buildHostPortConformanceCheck(id, passed, detail)`
- `ProviderConformanceReport`
- `EntrypointConformanceReport`
- `HostConformanceReport`
- `AuthoringConformanceReport`
- `ProjectionConformanceReport`

## Export Paths

- `@gooi/conformance` (provider suite default)
- `@gooi/conformance/provider`
- `@gooi/conformance/entrypoint`
- `@gooi/conformance/host`
- `@gooi/conformance/replay-store`
- `@gooi/conformance/authoring`
- `@gooi/conformance/cross-client-readiness`
- `@gooi/conformance/reachability-parity`
- `@gooi/conformance/projection`
- `@gooi/conformance/dispatch-render`
- `@gooi/conformance/surface-extension`
- `@gooi/conformance/guard`
- `@gooi/conformance/scenario`
- `@gooi/conformance/host-port-conformance`
- `@gooi/conformance/provider-contracts`
- `@gooi/conformance/entrypoint-contracts`
- `@gooi/conformance/host-contracts`
- `@gooi/conformance/replay-store-contracts`
- `@gooi/conformance/authoring-contracts`
- `@gooi/conformance/cross-client-readiness-contracts`
- `@gooi/conformance/reachability-parity-contracts`
- `@gooi/conformance/projection-contracts`
- `@gooi/conformance/dispatch-render-contracts`
- `@gooi/conformance/surface-extension-contracts`
- `@gooi/conformance/guard-contracts`
- `@gooi/conformance/scenario-contracts`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
