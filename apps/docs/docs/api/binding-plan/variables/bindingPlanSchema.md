[**@gooi/binding-plan**](../README.md)

***

[@gooi/binding-plan](../README.md) / bindingPlanSchema

# Variable: bindingPlanSchema

> `const` **bindingPlanSchema**: `ZodObject`\<\{ `appId`: `ZodString`; `capabilityBindings`: `ZodArray`\<`ZodObject`\<\{ `portId`: `ZodString`; `portVersion`: `ZodString`; `providerId`: `ZodString`; \}, `$strip`\>\>; `environment`: `ZodString`; `hostApiVersion`: `ZodString`; \}, `$strip`\>

Defined in: index.ts:26

Deployment binding plan resolved for one app environment.
