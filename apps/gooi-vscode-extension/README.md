# @gooi/vscode-extension

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

First-party VS Code extension surface for Gooi authoring intelligence (RFC-0004).

## Overview

This app adapts VS Code editor APIs to `@gooi/product-authoring-lsp` handlers.

Features:

- completion + resolve
- diagnostics (`didOpen` / `didChange` push mode)
- hover / definition / references
- document symbols / workspace symbols
- code lenses + lens resolve commands
- prepare rename + rename edits

## Configuration

- `gooi.authoring.contextPath` (default `.gooi/authoring-context.json`)
- `gooi.authoring.diagnosticsMode` (`push` | `pull`, default `push`)
- `gooi.authoring.enableCodeLens` (default `true`)

## Build and test

```bash
bun --filter gooi-vscode-extension typecheck
bun --filter gooi-vscode-extension test
bun --filter gooi-vscode-extension build
```

## Package and publish

```bash
bun --filter gooi-vscode-extension package:vsix
```

Publishing workflow:

1. Build and package VSIX.
2. Validate smoke tests and runbooks.
3. Publish with `vsce` using a scoped marketplace token.

Runbooks:

- [release-runbook.md](./docs/release-runbook.md)
- [rollback-runbook.md](./docs/rollback-runbook.md)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
