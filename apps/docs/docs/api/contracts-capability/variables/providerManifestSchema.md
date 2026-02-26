[**@gooi/contracts-capability**](../README.md)

***

[@gooi/contracts-capability](../README.md) / providerManifestSchema

# Variable: providerManifestSchema

> `const` **providerManifestSchema**: `ZodObject`\<\{ `capabilities`: `ZodArray`\<`ZodObject`\<\{ `contractHash`: `ZodString`; `portId`: `ZodString`; `portVersion`: `ZodString`; \}, `$strip`\>\>; `hostApiRange`: `ZodString`; `providerId`: `ZodString`; `providerVersion`: `ZodString`; \}, `$strip`\>

Defined in: index.ts:77

Provider manifest contract used by runtime activation.
