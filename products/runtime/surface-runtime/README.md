# @gooi/surface-runtime

Deterministic surface dispatch and surface-request to entrypoint-input binding runtime.

## Quick Start

```ts
import { dispatchAndBindSurfaceIngress } from "@gooi/surface-runtime";

const result = dispatchAndBindSurfaceIngress({
  surfaceId: "http",
  ingress: { method: "GET", path: "/messages", query: { page: "2" } },
  dispatchPlans,
  entrypoints,
  bindings,
});

if (!result.ok) {
  throw new Error(result.error.message);
}
```

## Public API

- `bindSurfaceInput(input)`
- `dispatchSurfaceRequest(input)`
- `dispatchAndBindSurfaceInput(input)`
- `dispatchAndBindSurfaceIngress(input)`
- `createSurfaceAdapterRegistry(adapters)`
- Surface contracts are published from `@gooi/surface-contracts` via `surfaceContracts`
