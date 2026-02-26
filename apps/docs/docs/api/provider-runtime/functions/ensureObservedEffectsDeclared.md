[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / ensureObservedEffectsDeclared

# Function: ensureObservedEffectsDeclared()

> **ensureObservedEffectsDeclared**(`declaredEffects`, `observedEffects`): [`RuntimeResult`](../type-aliases/RuntimeResult.md)\<`void`\>

Defined in: provider-runtime/src/index.ts:345

Ensures all observed side effects were declared in the capability contract.

## Parameters

### declaredEffects

readonly (`"read"` \| `"write"` \| `"emit"` \| `"session"` \| `"network"` \| `"compute"`)[]

Declared effect set from capability contract.

### observedEffects

readonly (`"read"` \| `"write"` \| `"emit"` \| `"session"` \| `"network"` \| `"compute"`)[]

Provider-observed effect set from invocation.

## Returns

[`RuntimeResult`](../type-aliases/RuntimeResult.md)\<`void`\>

Success when observed effects are a subset of declared effects.

## Example

```ts
const checked = ensureObservedEffectsDeclared(["write"], ["write"]);
```
