[**@gooi/conformance**](../README.md)

***

[@gooi/conformance](../README.md) / RunConformanceInput

# Interface: RunConformanceInput

Defined in: conformance/src/index.ts:48

Input required for conformance checks.

## Properties

### bindingPlan?

> `readonly` `optional` **bindingPlan**: `object`

Defined in: conformance/src/index.ts:60

Optional plan artifact for activation enforcement.

#### appId

> **appId**: `string`

#### capabilityBindings

> **capabilityBindings**: `object`[]

#### environment

> **environment**: `string`

#### hostApiVersion

> **hostApiVersion**: `string` = `semverSchema`

***

### contract

> `readonly` **contract**: `CapabilityPortContract`

Defined in: conformance/src/index.ts:54

Capability contract exercised by conformance test.

***

### hostApiVersion

> `readonly` **hostApiVersion**: `string`

Defined in: conformance/src/index.ts:52

Host API version used for activation.

***

### invalidInput

> `readonly` **invalidInput**: `unknown`

Defined in: conformance/src/index.ts:58

Invalid input expected to fail contract validation.

***

### lockfile?

> `readonly` `optional` **lockfile**: `object`

Defined in: conformance/src/index.ts:62

Optional lockfile artifact for activation enforcement.

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

> `readonly` **providerModule**: `ProviderModule`

Defined in: conformance/src/index.ts:50

Provider module under test.

***

### validInput

> `readonly` **validInput**: `unknown`

Defined in: conformance/src/index.ts:56

Valid input expected to pass contract validation.
