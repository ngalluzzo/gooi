# @gooi/product-authoring-lsp

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Snapshot-driven read-path handlers for RFC-0003 authoring intelligence.

## Overview

`@gooi/product-authoring-lsp` implements the Phase 3 read path for product authoring:
completion, hover, diagnostics, definition/references, and symbol queries.

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
- `getAuthoringHover(value)`
- `getAuthoringDefinition(value)`
- `getAuthoringReferences(value)`
- `listAuthoringDocumentSymbols(value)`
- `searchAuthoringWorkspaceSymbols(value)`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
