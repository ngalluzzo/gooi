[**@gooi/binding**](../README.md)

***

[@gooi/binding](../README.md) / parseBindingPlan

# Function: parseBindingPlan()

> **parseBindingPlan**(`value`): `object`

Defined in: index.ts:91

Validates and parses a binding plan artifact.

## Parameters

### value

`unknown`

Untrusted plan input.

## Returns

`object`

Parsed binding plan.

### appId

> **appId**: `string`

### capabilityBindings

> **capabilityBindings**: `object`[]

### environment

> **environment**: `string`

### hostApiVersion

> **hostApiVersion**: `string` = `semverSchema`

## Example

```ts
const plan = parseBindingPlan(rawPlan);
```
