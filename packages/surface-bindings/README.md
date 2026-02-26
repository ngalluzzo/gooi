# @gooi/surface-bindings

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Deterministic surface input binding for Gooi composable entrypoints.

## Overview

`@gooi/surface-bindings` maps native surface payloads (`path`, `query`, `body`, `args`, `flags`) into typed entrypoint inputs using compiled binding contracts.

## Features

- Deterministic bind precedence (explicit input then defaults)
- Scalar coercion for `int`, `number`, `bool`, and `timestamp`
- Required-field enforcement with typed `binding_error`
- Unknown binding field rejection
- Portable runtime result shape for adapters

## Installation

```bash
bun add @gooi/surface-bindings
```

## Quick Start

```ts
import { bindSurfaceInput } from "@gooi/surface-bindings";

const bound = bindSurfaceInput({
  request,
  entrypoint,
  binding,
});
```

## API Summary

- `bindSurfaceInput(input)`
- `BindingError`
- `SurfaceRequestPayload`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
