[**@gooi/conformance**](../README.md)

***

[@gooi/conformance](../README.md) / runProviderConformance

# Function: runProviderConformance()

> **runProviderConformance**(`input`): `Promise`\<[`ConformanceReport`](../interfaces/ConformanceReport.md)\>

Defined in: conformance/src/index.ts:90

Runs the minimal RFC-0001 provider conformance suite.

## Parameters

### input

[`RunConformanceInput`](../interfaces/RunConformanceInput.md)

Conformance harness input.

## Returns

`Promise`\<[`ConformanceReport`](../interfaces/ConformanceReport.md)\>

Conformance report with named checks.

## Example

```ts
const report = await runProviderConformance({
  providerModule,
  hostApiVersion: "1.0.0",
  contract,
  validInput: { count: 1 },
  invalidInput: { count: 0 },
});
```
