[**@gooi/binding**](../README.md)

***

[@gooi/binding](../README.md) / parseDeploymentLockfile

# Function: parseDeploymentLockfile()

> **parseDeploymentLockfile**(`value`): `object`

Defined in: index.ts:103

Validates and parses a deployment lockfile artifact.

## Parameters

### value

`unknown`

Untrusted lockfile input.

## Returns

`object`

Parsed lockfile.

### appId

> **appId**: `string`

### environment

> **environment**: `string`

### hostApiVersion

> **hostApiVersion**: `string` = `semverSchema`

### providers

> **providers**: `object`[]

## Example

```ts
const lockfile = parseDeploymentLockfile(rawLockfile);
```
