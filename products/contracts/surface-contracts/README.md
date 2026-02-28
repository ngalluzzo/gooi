# @gooi/surface-contracts

Zod-first contracts for surface request payloads, binding outcomes, and runtime envelopes.

## Package API

- `@gooi/surface-contracts/binding`
- `@gooi/surface-contracts/request`
- `@gooi/surface-contracts/dispatch`
- `@gooi/surface-contracts/envelope`

## Installation

```bash
bun add @gooi/surface-contracts
```

## Quick Start

```ts
import { request } from "@gooi/surface-contracts/request";
import { envelope } from "@gooi/surface-contracts/envelope";

const parsedRequest = request.parseSurfaceRequestPayload(rawRequest);
const result = envelope.parseResultEnvelope(rawResult);
```

## Result Envelope Notes

- `result.meta.refreshTriggers` is the canonical invalidation payload set:
  `signalId`, `signalVersion`, `payloadHash`.
- `result.meta.affectedQueryIds` is a deterministic, sorted set resolved from
  compiled refresh subscriptions.

## Development

```bash
bun run typecheck
bun run test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
