# @gooi/spec-compiler

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Deterministic compiler for Gooi composable entrypoint specs.

## Overview

`@gooi/spec-compiler` validates authoring specs, compiles query/mutation entrypoint artifacts, produces deterministic hashes, and emits refresh subscription indexes for runtime consumption.

## Features

- Zod-validated authoring spec subset for entrypoint execution
- Deterministic compiled artifact hashing
- Compiled entrypoint contracts with generated input schema artifacts
- Compiled surface bindings and access plan artifacts
- Compiled binding requirements artifact for deployment resolver inputs
- Artifact manifest references with compatibility metadata for emitted artifacts
- Compiled query refresh subscription index from `refresh_on_signals`
- Typed diagnostics for compile failures

## Installation

```bash
bun add @gooi/spec-compiler
```

## Quick Start

```ts
import { compileEntrypointBundle } from "@gooi/spec-compiler";

const result = compileEntrypointBundle({
  spec,
  compilerVersion: "1.0.0",
});

if (!result.ok) {
  console.error(result.diagnostics);
}
```

## API Summary

- `compileEntrypointBundle(input)`
- `parseAuthoringEntrypointSpec(value)`
- `parseCompiledEntrypointBundle(value)`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
