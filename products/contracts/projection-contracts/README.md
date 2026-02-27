# @gooi/projection-contracts

Typed contracts for projection plans, timeline history policies, runtime result
envelopes, and projection error taxonomy.

## Features

- Discriminated projection strategy plans (`from_collection`, `join`, `aggregate`, `timeline`)
- Timeline history/rebuild policy contracts
- Timeline signal migration replay contracts
- History provider operation contracts
- Typed projection result envelope metadata
- Stable typed projection error codes with source references

## Export Paths

- `@gooi/projection-contracts/plans/projection-plan`
- `@gooi/projection-contracts/plans/timeline-history-policy`
- `@gooi/projection-contracts/plans/signal-migration-plan`
- `@gooi/projection-contracts/ports/history-port-contract`
- `@gooi/projection-contracts/envelopes/projection-result-envelope`
- `@gooi/projection-contracts/errors/projection-errors`
