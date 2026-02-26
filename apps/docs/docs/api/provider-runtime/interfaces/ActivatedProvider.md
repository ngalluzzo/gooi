[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / ActivatedProvider

# Interface: ActivatedProvider

Defined in: provider-runtime/src/index.ts:152

Activated provider state tracked by runtime host.

## Properties

### contracts

> `readonly` **contracts**: `ReadonlyMap`\<`string`, `CapabilityPortContract`\>

Defined in: provider-runtime/src/index.ts:158

Capability contracts indexed by `portId@portVersion`.

***

### instance

> `readonly` **instance**: [`ProviderInstance`](ProviderInstance.md)

Defined in: provider-runtime/src/index.ts:156

Runtime provider instance.

***

### manifest

> `readonly` **manifest**: `object`

Defined in: provider-runtime/src/index.ts:154

Parsed provider manifest.

#### capabilities

> **capabilities**: `object`[]

#### hostApiRange

> **hostApiRange**: `string`

#### providerId

> **providerId**: `string`

#### providerVersion

> **providerVersion**: `string` = `semverSchema`
