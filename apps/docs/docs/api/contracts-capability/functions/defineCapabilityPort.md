[**@gooi/contracts-capability**](../README.md)

***

[@gooi/contracts-capability](../README.md) / defineCapabilityPort

# Function: defineCapabilityPort()

> **defineCapabilityPort**(`input`): [`CapabilityPortContract`](../interfaces/CapabilityPortContract.md)

Defined in: index.ts:267

Defines a capability contract from Zod boundary schemas.

## Parameters

### input

[`DefineCapabilityPortInput`](../interfaces/DefineCapabilityPortInput.md)

Capability contract definition.

## Returns

[`CapabilityPortContract`](../interfaces/CapabilityPortContract.md)

Capability contract with generated artifacts and deterministic hash.

## Example

```ts
const port = defineCapabilityPort({
  id: "ids.generate",
  version: "1.0.0",
  input: z.object({ count: z.number().int().positive() }),
  output: z.object({ ids: z.array(z.string()) }),
  error: z.object({ code: z.string(), message: z.string() }),
  declaredEffects: ["compute"],
});
```
