# @gooi/product-authoring-lsp

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Snapshot-driven handlers for RFC-0003 authoring intelligence read and action paths.

## Overview

`@gooi/product-authoring-lsp` implements product authoring LSP handlers for:
completion, hover, diagnostics, symbol navigation, code lenses, and rename-safe edits.

The package is deterministic and artifact-driven. It consumes:

- `CapabilityIndexSnapshot@1.0.0`
- `SymbolGraphSnapshot@1.0.0`
- `AuthoringLockfile@1.0.0`

## Features

- Context-aware completion domain inference (`do`, `emits`, `refresh_on_signals`)
- Deferred completion metadata resolution (`completionItem/resolve` style)
- Lockfile parity evaluation with degraded read-mode behavior
- Deterministic diagnostics ordering (`path`, `code`, `message`)
- Graph-backed definition/references and symbol listing helpers
- Code lens list/resolve for run, provider visibility, and affected-query actions
- Rename preflight (`prepareRename`) and workspace edits (`rename`) with conflict checks
- Stateful session helpers for `didOpen` / `didChange` integration loops
- Protocol test server for LSP-style message routing in E2E fixture tests
- Latency threshold tests enforcing RFC-0003 p95 targets in the test suite

## Installation

```bash
bun add @gooi/product-authoring-lsp
```

## Quick Start

```ts
import { listAuthoringCompletionItems } from "@gooi/product-authoring-lsp";

const result = listAuthoringCompletionItems({
  context,
  position: { line: 3, character: 10 },
});

console.log(result.parity.status, result.items.map((item) => item.label));
```

## API Summary

- `listAuthoringCompletionItems(value)`
- `resolveAuthoringCompletionItem(value)`
- `publishAuthoringDiagnostics(value)`
- `listAuthoringCodeLenses(value)`
- `resolveAuthoringCodeLens(value)`
- `getAuthoringHover(value)`
- `getAuthoringDefinition(value)`
- `getAuthoringReferences(value)`
- `listAuthoringDocumentSymbols(value)`
- `searchAuthoringWorkspaceSymbols(value)`
- `prepareAuthoringRename(value)`
- `applyAuthoringRename(value)`
- `createAuthoringSession(value)`
- `createAuthoringProtocolServer(value)`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
