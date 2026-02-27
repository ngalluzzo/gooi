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
- JSON Schema artifact generation helpers (`draft-4`, `draft-7`, `draft-2020-12`, `openapi-3.0`)
- Deterministic stable JSON hashing for compatibility and lockfiles
- Typed provider manifest schema parsing with execution-host reachability metadata
- Explicit effect declaration model
- Deterministic provider-manifest parse behavior for identical inputs

## Compatibility Policy

- Additive changes:
  - Adding optional input/output fields is non-breaking when existing required fields and types remain stable.
  - Widening supported execution hosts is additive.
- Breaking changes:
  - Renaming or removing fields, changing requiredness, or changing field types is breaking and requires a major version bump.
  - Narrowing supported execution hosts is breaking.
- Enforcement model:
  - Contract compatibility is enforced through semver + deterministic `contractHash`.
  - Provider activation must match declared `portId`, `portVersion`, and `contractHash` in manifest + lock/binding artifacts.
- Schema profile policy:
  - Host/provider boundary contracts are pinned to `draft-2020-12` via `hostProviderSchemaProfile`.
  - Runtime compatibility checks fail with typed `schema_profile_mismatch` diagnostics if artifacts drift from the pinned profile.
- Manifest versioning:
  - `providerVersion` and each capability `portVersion` must be `MAJOR.MINOR.PATCH` semver strings.
  - Breaking capability contract changes require a new major `portVersion`; provider releases should publish a corresponding `providerVersion`.

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
- `safeParseProviderManifest(value)`
  - Returns structured parse issues without throwing.
- `executionHostSchema`
  - Canonical provider capability execution-host contract (`browser|node|edge|worker`).

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
