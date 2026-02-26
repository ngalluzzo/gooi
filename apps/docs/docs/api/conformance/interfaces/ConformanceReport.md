[**@gooi/conformance**](../README.md)

***

[@gooi/conformance](../README.md) / ConformanceReport

# Interface: ConformanceReport

Defined in: conformance/src/index.ts:34

Conformance report for one provider module.

## Properties

### checks

> `readonly` **checks**: readonly [`ConformanceCheckResult`](ConformanceCheckResult.md)[]

Defined in: conformance/src/index.ts:42

Individual check outcomes.

***

### hostApiVersion

> `readonly` **hostApiVersion**: `string`

Defined in: conformance/src/index.ts:38

Host API version used during evaluation.

***

### passed

> `readonly` **passed**: `boolean`

Defined in: conformance/src/index.ts:40

Aggregate pass status.

***

### providerId

> `readonly` **providerId**: `string`

Defined in: conformance/src/index.ts:36

Provider id under test.
