[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / ProviderModule

# Interface: ProviderModule

Defined in: provider-runtime/src/index.ts:124

Provider module contract loaded via dynamic import.

## Properties

### activate()

> `readonly` **activate**: (`context`) => `Promise`\<[`ProviderInstance`](ProviderInstance.md)\>

Defined in: provider-runtime/src/index.ts:128

Activation entrypoint producing an invocation instance.

#### Parameters

##### context

[`ActivateContext`](ActivateContext.md)

#### Returns

`Promise`\<[`ProviderInstance`](ProviderInstance.md)\>

***

### manifest

> `readonly` **manifest**: `unknown`

Defined in: provider-runtime/src/index.ts:126

Static provider manifest used for compatibility checks.
