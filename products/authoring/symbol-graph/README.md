# @gooi/symbol-graph

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Deterministic symbol graph contracts and builders for RFC-0003 phase 2.

## Overview

`@gooi/symbol-graph` builds and validates `SymbolGraphSnapshot@1.0.0` artifacts used by authoring navigation, rename safety, and code-lens derivations.

## Features

- Symbol kinds for entrypoints, signals, actions, expression-local symbols, and ambient symbols.
- Deterministic reference graph artifact hashing.
- Multi-hop signal impact edge derivation:
  - `action -> signal` (`emits_signal`)
  - `signal -> query` (`refresh_subscription`)
  - `action -> query` (`impacts_query`)
- Reference edge integrity checks against known symbol ids.

## Installation

```bash
bun add @gooi/symbol-graph
```

## Quick Start

```ts
import { buildSymbolGraphSnapshot } from "@gooi/symbol-graph";

const snapshot = buildSymbolGraphSnapshot({
	sourceHash: "a".repeat(64),
	symbols: [],
	references: [],
	signalImpact: { actions: [], queries: [] },
	renameConstraints: [],
});
```

## API Summary

- `buildSymbolGraphSnapshot(input)`
- `deriveSignalImpactEdges(input)`
- `parseSymbolGraphSnapshot(value)`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
