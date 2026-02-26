# @gooi/capability-contracts

[![CI](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/ci.yml)
[![Security](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/security.yml)
[![Release](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml/badge.svg)](https://github.com/ngalluzzo/gooi/actions/workflows/release.yml)

Zod-first boundary contract definitions for capability ports, provider manifests, JSON Schema artifacts, and deterministic contract hashing.

## Feature Entry Points

- `@gooi/capability-contracts/capability-port`
- `@gooi/capability-contracts/provider-manifest`

## Overview

`@gooi/capability-contracts` is the contract layer for RFC-0001.
It defines capability IO using Zod schemas, generates normalized JSON Schema artifacts, and computes stable SHA-256 hashes used by binding and activation checks.

## Features

- Zod-authored boundary contracts for input/output/error payloads
- JSON Schema artifact generation (`draft-4`, `draft-7`, `draft-2020-12`, `openapi-3.0`)
- Deterministic stable JSON hashing for compatibility and lockfiles
- Typed provider manifest schema parsing
- Explicit effect declaration model

## Installation

```bash
bun add @gooi/capability-contracts
```

## Quick Start

```ts
import { defineCapabilityPort } from "@gooi/capability-contracts/capability-port";
import { z } from "zod";

const idsGeneratePort = defineCapabilityPort({
  id: "ids.generate",
  version: "1.0.0",
  input: z.object({ count: z.number().int().positive() }),
  output: z.object({ ids: z.array(z.string()) }),
  error: z.object({ code: z.string(), message: z.string() }),
  declaredEffects: ["compute"],
});

console.log(idsGeneratePort.artifacts.contractHash);
```

## API Summary

- `defineCapabilityPort(input)`
  - Builds a typed capability contract and generated artifacts.
- `effectKindSchema`
  - Declares allowed observed effect categories.
- `buildSchemaArtifact(schema, target)`
  - Converts a Zod schema to normalized JSON Schema plus hash.
- `parseProviderManifest(value)`
  - Validates provider manifest payloads.

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
