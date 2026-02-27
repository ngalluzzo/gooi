# @gooi-marketplace/memory

Reference marketplace provider implementations backed by in-memory state.

## Feature Entry Points

- `@gooi-marketplace/memory/clock`
- `@gooi-marketplace/memory/identity`
- `@gooi-marketplace/memory/principal`
- `@gooi-marketplace/memory/replay-store`
- `@gooi-marketplace/memory/activation-policy`
- `@gooi-marketplace/memory/module-loader`
- `@gooi-marketplace/memory/module-integrity`
- `@gooi-marketplace/memory/delegation`

## Quick Start

```ts
import { createMemoryReplayStorePort } from "@gooi-marketplace/memory/replay-store";

const replayStore = createMemoryReplayStorePort();
```
