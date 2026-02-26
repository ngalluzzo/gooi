[**@gooi/binding-plan**](../README.md)

***

[@gooi/binding-plan](../README.md) / getCapabilityBinding

# Function: getCapabilityBinding()

> **getCapabilityBinding**(`plan`, `portId`, `portVersion`): \{ `portId`: `string`; `portVersion`: `string`; `providerId`: `string`; \} \| `null`

Defined in: index.ts:117

Locates the provider binding for a capability reference.

## Parameters

### plan

Parsed binding plan.

#### appId

`string` = `...`

#### capabilityBindings

`object`[] = `...`

#### environment

`string` = `...`

#### hostApiVersion

`string` = `semverSchema`

### portId

`string`

Capability port id.

### portVersion

`string`

Capability port semver.

## Returns

\{ `portId`: `string`; `portVersion`: `string`; `providerId`: `string`; \} \| `null`

Matching binding, if present.

## Example

```ts
const binding = getCapabilityBinding(plan, "ids.generate", "1.0.0");
```
