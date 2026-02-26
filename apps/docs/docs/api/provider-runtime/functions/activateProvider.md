[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / activateProvider

# Function: activateProvider()

> **activateProvider**(`input`): `Promise`\<[`RuntimeResult`](../type-aliases/RuntimeResult.md)\<[`ActivatedProvider`](../interfaces/ActivatedProvider.md)\>\>

Defined in: provider-runtime/src/index.ts:468

Activates a provider module with compatibility and binding checks.

## Parameters

### input

[`ActivateProviderInput`](../interfaces/ActivateProviderInput.md)

Activation input.

## Returns

`Promise`\<[`RuntimeResult`](../type-aliases/RuntimeResult.md)\<[`ActivatedProvider`](../interfaces/ActivatedProvider.md)\>\>

Activated provider state or typed runtime error.

## Example

```ts
const activated = await activateProvider({
  providerModule,
  hostApiVersion: "1.0.0",
  contracts: [contract],
});
```
