# @gooi/surface-contracts

Zod-first contracts for surface request payloads, binding outcomes, and runtime envelopes.

## Feature Entry Points

- `@gooi/surface-contracts/surface-request`
- `@gooi/surface-contracts/binding`
- `@gooi/surface-contracts/envelope-version`
- `@gooi/surface-contracts/invocation-envelope`
- `@gooi/surface-contracts/signal-envelope`
- `@gooi/surface-contracts/result-envelope`

## Installation

```bash
bun add @gooi/surface-contracts
```

## Quick Start

```ts
import { parseSurfaceRequestPayload } from "@gooi/surface-contracts/surface-request";
import { parseResultEnvelope } from "@gooi/surface-contracts/result-envelope";

const request = parseSurfaceRequestPayload(rawRequest);
const result = parseResultEnvelope(rawResult);
```

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
