[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / deactivateProvider

# Function: deactivateProvider()

> **deactivateProvider**(`activated`): `Promise`\<[`RuntimeResult`](../type-aliases/RuntimeResult.md)\<`void`\>\>

Defined in: provider-runtime/src/index.ts:687

Deactivates an activated provider instance.

## Parameters

### activated

[`ActivatedProvider`](../interfaces/ActivatedProvider.md)

Activated provider state.

## Returns

`Promise`\<[`RuntimeResult`](../type-aliases/RuntimeResult.md)\<`void`\>\>

Success when provider deactivation completes.

## Example

```ts
await deactivateProvider(activated);
```
