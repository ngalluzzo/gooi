[**@gooi/binding**](../README.md)

***

[@gooi/binding](../README.md) / areBindingArtifactsAligned

# Function: areBindingArtifactsAligned()

> **areBindingArtifactsAligned**(`plan`, `lockfile`): `boolean`

Defined in: index.ts:184

Validates that binding plan and lockfile refer to the same deployment scope.

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

### lockfile

Parsed lockfile.

#### appId

`string` = `...`

#### environment

`string` = `...`

#### hostApiVersion

`string` = `semverSchema`

#### providers

`object`[] = `...`

## Returns

`boolean`

True when app, environment, and host API match.

## Example

```ts
const aligned = areBindingArtifactsAligned(plan, lockfile);
```
