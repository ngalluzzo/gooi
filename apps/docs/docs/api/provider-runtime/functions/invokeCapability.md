[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / invokeCapability

# Function: invokeCapability()

> **invokeCapability**(`activated`, `call`): `Promise`\<[`RuntimeResult`](../type-aliases/RuntimeResult.md)\<[`CapabilityResult`](../interfaces/CapabilityResult.md)\>\>

Defined in: provider-runtime/src/index.ts:588

Invokes a validated capability contract on an activated provider.

## Parameters

### activated

[`ActivatedProvider`](../interfaces/ActivatedProvider.md)

Activated provider state.

### call

[`CapabilityCall`](../interfaces/CapabilityCall.md)

Invocation envelope.

## Returns

`Promise`\<[`RuntimeResult`](../type-aliases/RuntimeResult.md)\<[`CapabilityResult`](../interfaces/CapabilityResult.md)\>\>

Parsed output or typed runtime error.

## Example

```ts
const result = await invokeCapability(activated, call);
```
