[**@gooi/capability-contracts**](../README.md)

***

[@gooi/capability-contracts](../README.md) / CapabilityArtifacts

# Interface: CapabilityArtifacts

Defined in: index.ts:104

Full schema artifact set for capability boundary IO.

## Properties

### contractHash

> `readonly` **contractHash**: `string`

Defined in: index.ts:112

Deterministic hash across all capability contract fields.

***

### error

> `readonly` **error**: [`SchemaArtifact`](SchemaArtifact.md)

Defined in: index.ts:110

Error schema artifact generated from Zod.

***

### input

> `readonly` **input**: [`SchemaArtifact`](SchemaArtifact.md)

Defined in: index.ts:106

Input schema artifact generated from Zod.

***

### output

> `readonly` **output**: [`SchemaArtifact`](SchemaArtifact.md)

Defined in: index.ts:108

Output schema artifact generated from Zod.
