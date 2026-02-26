[**@gooi/binding**](../README.md)

***

[@gooi/binding](../README.md) / providerHasLockedCapability

# Function: providerHasLockedCapability()

> **providerHasLockedCapability**(`provider`, `portId`, `portVersion`, `contractHash`): `boolean`

Defined in: index.ts:161

Checks whether a lock entry contains an exact capability contract hash.

## Parameters

### provider

Locked provider entry.

#### capabilities

`object`[] = `...`

#### integrity

`string` = `...`

#### providerId

`string` = `...`

#### providerVersion

`string` = `semverSchema`

### portId

`string`

Capability port id.

### portVersion

`string`

Capability semver.

### contractHash

`string`

Expected capability contract hash.

## Returns

`boolean`

True when lock entry is present and hash matches.

## Example

```ts
const matches = providerHasLockedCapability(provider, "ids.generate", "1.0.0", hash);
```
