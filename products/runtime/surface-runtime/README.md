# @gooi/surface-runtime

Deterministic surface-request to entrypoint-input binding runtime.

## Quick Start

```ts
import { bindSurfaceInput } from "@gooi/surface-runtime";

const result = bindSurfaceInput({
  request,
  entrypoint,
  binding,
});

if (!result.ok) {
  throw new Error(result.error.message);
}
```

## Public API

- `bindSurfaceInput(input)`
- Surface contracts are published from `@gooi/surface-contracts` via `surfaceContracts`
