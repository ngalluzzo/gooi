[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / CapabilityResult

# Interface: CapabilityResult

Defined in: provider-runtime/src/index.ts:90

Provider response envelope for one capability invocation.

## Properties

### error?

> `readonly` `optional` **error**: `unknown`

Defined in: provider-runtime/src/index.ts:96

Error payload when `ok` is false.

***

### observedEffects

> `readonly` **observedEffects**: readonly (`"read"` \| `"write"` \| `"emit"` \| `"session"` \| `"network"` \| `"compute"`)[]

Defined in: provider-runtime/src/index.ts:98

Runtime-observed side effects.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: provider-runtime/src/index.ts:92

True when invocation completed with output payload.

***

### output?

> `readonly` `optional` **output**: `unknown`

Defined in: provider-runtime/src/index.ts:94

Output payload when `ok` is true.
