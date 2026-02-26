[**@gooi/provider-runtime**](../README.md)

***

[@gooi/provider-runtime](../README.md) / CapabilityCall

# Interface: CapabilityCall

Defined in: provider-runtime/src/index.ts:74

Capability invocation envelope sent to provider instances.

## Properties

### ctx

> `readonly` **ctx**: [`InvocationContext`](InvocationContext.md)

Defined in: provider-runtime/src/index.ts:84

Runtime invocation context.

***

### input

> `readonly` **input**: `unknown`

Defined in: provider-runtime/src/index.ts:80

Input payload validated by boundary contract.

***

### portId

> `readonly` **portId**: `string`

Defined in: provider-runtime/src/index.ts:76

Capability port id.

***

### portVersion

> `readonly` **portVersion**: `string`

Defined in: provider-runtime/src/index.ts:78

Capability port version.

***

### principal

> `readonly` **principal**: [`PrincipalContext`](PrincipalContext.md)

Defined in: provider-runtime/src/index.ts:82

Principal context for authorization and tenancy policies.
