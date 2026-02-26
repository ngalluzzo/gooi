# @gooi/entrypoint-runtime

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Composable entrypoint execution runtime for Gooi.

## Overview

`@gooi/entrypoint-runtime` executes compiled query and mutation entrypoints with deterministic policy gates, typed envelopes, idempotency replay semantics, and signal-based refresh trigger matching.

## Features

- Invocation and result envelope contracts with explicit versioning
- Access gate enforcement over compiled access plan and principal context
- Surface binding normalization via `@gooi/surface-bindings`
- Query/mutation dispatch through domain runtime ports
- Mutation idempotency replay and conflict handling
- Refresh trigger generation and affected query matching

## Installation

```bash
bun add @gooi/entrypoint-runtime
```

## Quick Start

```ts
import { executeEntrypoint } from "@gooi/entrypoint-runtime";

const result = await executeEntrypoint({
  bundle,
  binding,
  request,
  principal,
  domainRuntime,
});
```

## API Summary

- `executeEntrypoint(input)`
- `createInMemoryIdempotencyStore()`
- `PrincipalContext`
- `ResultEnvelope`

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
