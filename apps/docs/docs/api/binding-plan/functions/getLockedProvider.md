[**@gooi/binding**](../README.md)

***

[@gooi/binding](../README.md) / getLockedProvider

# Function: getLockedProvider()

> **getLockedProvider**(`lockfile`, `providerId`, `providerVersion`): \{ `capabilities`: `object`[]; `integrity`: `string`; `providerId`: `string`; `providerVersion`: `string`; \} \| `null`

Defined in: index.ts:138

Locates a provider lock entry by provider id and version.

## Parameters

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

### providerId

`string`

Provider identity.

### providerVersion

`string`

Provider semver.

## Returns

\{ `capabilities`: `object`[]; `integrity`: `string`; `providerId`: `string`; `providerVersion`: `string`; \} \| `null`

Matching lock entry, if present.

## Example

```ts
const provider = getLockedProvider(lockfile, "gooi.providers.memory", "1.2.3");
```
