# @gooi/authoring-contracts

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Typed contract package for RFC-0003 phase 1 authoring envelopes and lockfiles.

## Overview

`@gooi/authoring-contracts` defines the canonical schema layer for Gooi authoring IO:

- `AuthoringRequestEnvelope@1.0.0`
- `AuthoringResultEnvelope@1.0.0`
- `AuthoringErrorEnvelope@1.0.0`
- `AuthoringDiagnosticsEnvelope@1.0.0`
- `AuthoringLockfile@1.0.0`

## Features

- Zod-first envelope schemas with parse helpers for CLI and LSP paths.
- Deterministic lockfile hashing with stable JSON serialization.
- Lockfile integrity validation that rejects hash/content mismatches.
- Forward-compatible lockfile source metadata (`sourceKind`, optional `remoteSource`).

## Installation

```bash
bun add @gooi/authoring-contracts
```

## Quick Start

```ts
import {
	createAuthoringLockfile,
	parseAuthoringLockfile,
} from "@gooi/authoring-contracts";

const lockfile = createAuthoringLockfile({
	artifactVersion: "1.0.0",
	sourceHash: "a".repeat(64),
	sourceKind: "workspace-local",
	requiredArtifacts: {
		compiledEntrypointBundle: {
			artifactId: "CompiledEntrypointBundle",
			artifactVersion: "1.0.0",
			artifactHash: "b".repeat(64),
		},
		capabilityIndexSnapshot: {
			artifactId: "CapabilityIndexSnapshot",
			artifactVersion: "1.0.0",
			artifactHash: "c".repeat(64),
		},
		symbolGraphSnapshot: {
			artifactId: "SymbolGraphSnapshot",
			artifactVersion: "1.0.0",
			artifactHash: "d".repeat(64),
		},
	},
	catalogSnapshot: {
		catalogSource: "local-catalog",
		catalogVersion: "2026-02-26",
		catalogHash: "e".repeat(64),
	},
	envelopeVersions: {
		authoringRequestEnvelope: "1.0.0",
		authoringResultEnvelope: "1.0.0",
		authoringErrorEnvelope: "1.0.0",
		authoringDiagnosticsEnvelope: "1.0.0",
	},
});

parseAuthoringLockfile(lockfile);
```

## API Summary

- `createAuthoringLockfile(value)`
- `parseAuthoringLockfile(value)`
- `parseAuthoringRequestEnvelope(value)`
- `parseAuthoringResultEnvelope(value)`
- `parseAuthoringErrorEnvelope(value)`
- `parseAuthoringDiagnosticsEnvelope(value)`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
