# @gooi/host-contracts

Typed host port contracts shared by runtime packages.

Concrete host-port implementations belong in marketplace provider packages.

## Feature Entry Points

- `@gooi/host-contracts/result`
- `@gooi/host-contracts/clock`
- `@gooi/host-contracts/identity`
- `@gooi/host-contracts/principal`
- `@gooi/host-contracts/replay`
- `@gooi/host-contracts/activation-policy`
- `@gooi/host-contracts/module-loader`
- `@gooi/host-contracts/module-integrity`
- `@gooi/host-contracts/delegation`

`module-loader` and `module-integrity` are additive extension contracts for future
provider loading and supply-chain verification flows. Current runtime milestones
keep them optional and backward-compatible.

## Quick Start

```ts
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import { createSystemClockPort } from "@gooi/host-contracts/clock";
import { createSystemIdentityPort } from "@gooi/host-contracts/identity";
import { createStrictActivationPolicyPort } from "@gooi/host-contracts/activation-policy";
import { createFailingCapabilityDelegationPort } from "@gooi/host-contracts/delegation";

const clock = createSystemClockPort();
const identity = createSystemIdentityPort();
const activationPolicy = createStrictActivationPolicyPort();
const capabilityDelegation = createFailingCapabilityDelegationPort();

const ok = hostOk({ now: clock.nowIso() });
const fail = hostFail("bad_request", "Invalid input");
```
