[**@gooi/binding-plan**](../README.md)

***

[@gooi/binding-plan](../README.md) / deploymentLockfileSchema

# Variable: deploymentLockfileSchema

> `const` **deploymentLockfileSchema**: `ZodObject`\<\{ `appId`: `ZodString`; `environment`: `ZodString`; `hostApiVersion`: `ZodString`; `providers`: `ZodArray`\<`ZodObject`\<\{ `capabilities`: `ZodArray`\<`ZodObject`\<\{ `contractHash`: `ZodString`; `portId`: `ZodString`; `portVersion`: `ZodString`; \}, `$strip`\>\>; `integrity`: `ZodString`; `providerId`: `ZodString`; `providerVersion`: `ZodString`; \}, `$strip`\>\>; \}, `$strip`\>

Defined in: index.ts:70

Deterministic lockfile artifact for resolved deployment providers.
