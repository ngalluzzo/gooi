[**@gooi/contracts-capability**](../README.md)

***

[@gooi/contracts-capability](../README.md) / buildSchemaArtifact

# Function: buildSchemaArtifact()

> **buildSchemaArtifact**(`schema`, `target`): [`SchemaArtifact`](../interfaces/SchemaArtifact.md)

Defined in: index.ts:215

Converts Zod schema to normalized JSON Schema artifact.

## Parameters

### schema

`ZodType`\<`unknown`\>

Boundary Zod schema.

### target

JSON Schema target draft.

`"draft-4"` | `"draft-7"` | `"draft-2020-12"` | `"openapi-3.0"`

## Returns

[`SchemaArtifact`](../interfaces/SchemaArtifact.md)

Generated artifact with deterministic hash.

## Example

```ts
const artifact = buildSchemaArtifact(z.object({ id: z.string() }), "draft-7");
```
