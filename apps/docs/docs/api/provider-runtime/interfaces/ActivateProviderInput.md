[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / ActivateProviderInput

# Interface: ActivateProviderInput

Defined in: provider-runtime/src/index.ts:134

Activation arguments for provider runtime.

## Properties

### activatedAt?

> `readonly` `optional` **activatedAt**: `string`

Defined in: provider-runtime/src/index.ts:146

Optional activation timestamp override.

***

### bindingPlan?

> `readonly` `optional` **bindingPlan**: `object`

Defined in: provider-runtime/src/index.ts:142

Optional resolved binding plan artifact for enforcement.

#### appId

> **appId**: `string`

#### capabilityBindings

> **capabilityBindings**: `object`[]

#### environment

> **environment**: `string`

#### hostApiVersion

> **hostApiVersion**: `string` = `semverSchema`

***

### contracts

> `readonly` **contracts**: readonly `CapabilityPortContract`[]

Defined in: provider-runtime/src/index.ts:140

Capability contracts expected to be fulfilled by this activation.

***

### hostApiVersion

> `readonly` **hostApiVersion**: `string`

Defined in: provider-runtime/src/index.ts:138

Host API version for compatibility checks.

***

### lockfile?

> `readonly` `optional` **lockfile**: `object`

Defined in: provider-runtime/src/index.ts:144

Optional lockfile artifact for deterministic provider resolution.

#### appId

> **appId**: `string`

#### environment

> **environment**: `string`

#### hostApiVersion

> **hostApiVersion**: `string` = `semverSchema`

#### providers

> **providers**: `object`[]

***

### providerModule

> `readonly` **providerModule**: [`ProviderModule`](ProviderModule.md)

Defined in: provider-runtime/src/index.ts:136

Untrusted provider module loaded from runtime.
