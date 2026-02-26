# Provider Authoring Guide (RFC-0001)

This guide defines the required contract for in-process providers loaded via dynamic import.

## Requirements

1. Declare a manifest with stable provider identity, version, host API range, and capability hashes.
2. Implement `activate()` returning `invoke()` and `deactivate()`.
3. Return typed capability envelopes from `invoke()`.
4. Report only observed effects declared by the capability contract.

## Manifest shape

```ts
import type { ProviderModule } from "@gooi/provider-runtime";

export const providerModule: ProviderModule = {
  manifest: {
    providerId: "gooi.providers.example",
    providerVersion: "1.0.0",
    hostApiRange: "^1.0.0",
    capabilities: [
      {
        portId: "ids.generate",
        portVersion: "1.0.0",
        contractHash: "<sha256>"
      }
    ]
  },
  activate: async () => ({
    invoke: async () => ({
      ok: true,
      output: { ids: ["id_1"] },
      observedEffects: ["compute"]
    }),
    deactivate: async () => undefined,
  }),
};
```

## Runtime enforcement

1. Activation fails when host API version is incompatible.
2. Activation fails when binding plan or lockfile does not match capability hashes.
3. Invocation fails when input/output/error payloads violate boundary Zod contracts.
4. Invocation fails when observed effects include undeclared effects.

## Packaging standards

1. Public API is exposed via `package.json` `exports`.
2. `exports` must include `types` and `default` entries.
3. Do not use barrel files for package API exposure.
4. Keep provider modules functional and explicit; avoid OOP patterns.
