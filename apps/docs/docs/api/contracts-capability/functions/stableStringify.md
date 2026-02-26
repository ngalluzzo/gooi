[**@gooi/contracts-capability**](../README.md)

***

[@gooi/contracts-capability](../README.md) / stableStringify

# Function: stableStringify()

> **stableStringify**(`value`): `string`

Defined in: index.ts:167

Deterministically stringifies JSON-like values by sorting object keys.

## Parameters

### value

`unknown`

Value to serialize.

## Returns

`string`

Stable JSON string.

## Example

```ts
stableStringify({ b: 1, a: 2 }) === '{"a":2,"b":1}'
```
