[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / ProviderInstance

# Interface: ProviderInstance

Defined in: provider-runtime/src/index.ts:114

Provider instance lifecycle contract.

## Properties

### deactivate()

> `readonly` **deactivate**: () => `Promise`\<`void`\>

Defined in: provider-runtime/src/index.ts:118

Performs provider shutdown and cleanup.

#### Returns

`Promise`\<`void`\>

***

### invoke()

> `readonly` **invoke**: (`call`) => `Promise`\<[`CapabilityResult`](CapabilityResult.md)\>

Defined in: provider-runtime/src/index.ts:116

Handles capability invocation envelopes.

#### Parameters

##### call

[`CapabilityCall`](CapabilityCall.md)

#### Returns

`Promise`\<[`CapabilityResult`](CapabilityResult.md)\>
