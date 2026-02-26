[**@gooi/capability-contracts**](../README.md)

***

[@gooi/capability-contracts](../README.md) / DefineCapabilityPortInput

# Interface: DefineCapabilityPortInput

Defined in: index.ts:141

Input for defining a capability port contract.

## Properties

### declaredEffects

> `readonly` **declaredEffects**: readonly (`"read"` \| `"write"` \| `"emit"` \| `"session"` \| `"network"` \| `"compute"`)[]

Defined in: index.ts:153

Declared side effects allowed at runtime.

***

### error

> `readonly` **error**: `ZodType`\<`unknown`\>

Defined in: index.ts:151

Error boundary schema authored in Zod.

***

### id

> `readonly` **id**: `string`

Defined in: index.ts:143

Unique capability port identifier.

***

### input

> `readonly` **input**: `ZodType`\<`unknown`\>

Defined in: index.ts:147

Input boundary schema authored in Zod.

***

### output

> `readonly` **output**: `ZodType`\<`unknown`\>

Defined in: index.ts:149

Output boundary schema authored in Zod.

***

### target?

> `readonly` `optional` **target**: `"draft-4"` \| `"draft-7"` \| `"draft-2020-12"` \| `"openapi-3.0"`

Defined in: index.ts:155

Optional JSON Schema draft target for generated artifacts.

***

### version

> `readonly` **version**: `string`

Defined in: index.ts:145

Semantic version for the capability port.
