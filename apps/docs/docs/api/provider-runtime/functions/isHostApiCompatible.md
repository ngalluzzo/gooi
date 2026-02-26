[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / isHostApiCompatible

# Function: isHostApiCompatible()

> **isHostApiCompatible**(`hostApiRange`, `hostApiVersion`): [`RuntimeResult`](../type-aliases/RuntimeResult.md)\<`boolean`\>

Defined in: provider-runtime/src/index.ts:272

Evaluates host API compatibility with a provider `hostApiRange` expression.

Supports `*`, exact semver (`1.2.3`), caret ranges (`^1.2.3`), and space-
separated comparator chains (for example `>=1.0.0 <2.0.0`).

## Parameters

### hostApiRange

`string`

Provider-declared host API range.

### hostApiVersion

`string`

Runtime host API version.

## Returns

[`RuntimeResult`](../type-aliases/RuntimeResult.md)\<`boolean`\>

Compatibility decision.

## Example

```ts
const compatible = isHostApiCompatible("^1.0.0", "1.2.3");
```
