# @gooi/capability-index

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Deterministic capability index contracts and builders for RFC-0003 phase 2.

## Overview

`@gooi/capability-index` builds and validates `CapabilityIndexSnapshot@1.0.0` artifacts used by authoring completion, hover, and diagnostics paths.

## Features

- Unified local-spec and catalog capability indexing with provenance.
- Canonical capability-id collision enforcement across sources.
- Deterministic sorting and artifact hash generation.
- Snapshot parser with strict artifact hash integrity checks.
- Capability lookup helper for authoring read paths.

## Installation

```bash
bun add @gooi/capability-index
```

## Quick Start

```ts
import { buildCapabilityIndexSnapshot } from "@gooi/capability-index";

const snapshot = buildCapabilityIndexSnapshot({
	sourceHash: "a".repeat(64),
	catalogIdentity: {
		catalogSource: "demo",
		catalogVersion: "2026-02-26",
		catalogHash: "b".repeat(64),
	},
	localCapabilities: [],
	catalogCapabilities: [],
});
```

## API Summary

- `buildCapabilityIndexSnapshot(input)`
- `parseCapabilityIndexSnapshot(value)`
- `resolveCapability(snapshot, query)`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
