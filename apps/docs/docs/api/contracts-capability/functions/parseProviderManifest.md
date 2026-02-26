[**@gooi/contracts-capability**](../README.md)

***

[@gooi/contracts-capability](../README.md) / parseProviderManifest

# Function: parseProviderManifest()

> **parseProviderManifest**(`value`): `object`

Defined in: index.ts:322

Parses and validates a provider manifest.

## Parameters

### value

`unknown`

Untrusted manifest value.

## Returns

`object`

Parsed provider manifest.

### capabilities

> **capabilities**: `object`[]

### hostApiRange

> **hostApiRange**: `string`

### providerId

> **providerId**: `string`

### providerVersion

> **providerVersion**: `string` = `semverSchema`

## Example

```ts
const manifest = parseProviderManifest(rawManifest);
```
