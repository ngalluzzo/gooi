[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / RuntimeError

# Interface: RuntimeError

Defined in: provider-runtime/src/index.ts:33

Structured runtime error payload.

## Properties

### details?

> `readonly` `optional` **details**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: provider-runtime/src/index.ts:39

Optional structured details for diagnostics.

***

### kind

> `readonly` **kind**: [`RuntimeErrorKind`](../type-aliases/RuntimeErrorKind.md)

Defined in: provider-runtime/src/index.ts:35

Error category for deterministic handling.

***

### message

> `readonly` **message**: `string`

Defined in: provider-runtime/src/index.ts:37

Human-readable message.
