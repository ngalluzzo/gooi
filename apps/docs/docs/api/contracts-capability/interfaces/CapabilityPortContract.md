[**@gooi/contracts-capability**](../README.md)

***

[@gooi/contracts-capability](../README.md) / CapabilityPortContract

# Interface: CapabilityPortContract

Defined in: index.ts:118

Zod-authored capability port contract.

## Properties

### artifacts

> `readonly` **artifacts**: [`CapabilityArtifacts`](CapabilityArtifacts.md)

Defined in: index.ts:135

Generated JSON Schema artifacts used for compatibility and locking.

***

### declaredEffects

> `readonly` **declaredEffects**: readonly (`"read"` \| `"write"` \| `"emit"` \| `"session"` \| `"network"` \| `"compute"`)[]

Defined in: index.ts:124

Allowed side-effect categories for observed runtime effects.

***

### id

> `readonly` **id**: `string`

Defined in: index.ts:120

Unique capability port identifier.

***

### schemas

> `readonly` **schemas**: `object`

Defined in: index.ts:126

Zod boundary schemas used for runtime validation.

#### error

> `readonly` **error**: `ZodType`\<`unknown`\>

Error Zod schema.

#### input

> `readonly` **input**: `ZodType`\<`unknown`\>

Input Zod schema.

#### output

> `readonly` **output**: `ZodType`\<`unknown`\>

Output Zod schema.

***

### version

> `readonly` **version**: `string`

Defined in: index.ts:122

Semantic version for this port contract.
