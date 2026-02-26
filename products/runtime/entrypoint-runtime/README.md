# @gooi/entrypoint-runtime

Composable runtime engine for executing compiled query and mutation entrypoints.

## Quick Start

```ts
import { createEntrypointRuntime } from "@gooi/entrypoint-runtime";

const runtime = createEntrypointRuntime({
  bundle,
  domainRuntime,
});

const result = await runtime.run({
  binding,
  request,
  principal,
});
```

## Public API

- `@gooi/entrypoint-runtime` -> `createEntrypointRuntime(config)`, `runEntrypoint(input)`, `createDefaultHostPorts()`, `DomainRuntimePort`
