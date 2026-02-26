[**@gooi/capability-contracts**](../README.md)

***

[@gooi/capability-contracts](../README.md) / SchemaArtifact

# Interface: SchemaArtifact

Defined in: index.ts:92

Generated JSON Schema artifact and deterministic hash for a boundary schema.

## Properties

### hash

> `readonly` **hash**: `string`

Defined in: index.ts:98

SHA-256 hash of normalized schema JSON.

***

### schema

> `readonly` **schema**: [`JsonSchema`](../type-aliases/JsonSchema.md)

Defined in: index.ts:96

Normalized JSON Schema object.

***

### target

> `readonly` **target**: `"draft-4"` \| `"draft-7"` \| `"draft-2020-12"` \| `"openapi-3.0"`

Defined in: index.ts:94

JSON Schema target draft.
