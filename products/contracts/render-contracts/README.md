# @gooi/render-contracts

Contracts for view render IR, node plans, and render/runtime envelopes.

## Scope

- Canonical render IR for screens and reusable nodes.
- Deterministic prop and interaction intent plan shapes.
- Typed envelopes for render evaluation and interaction dispatch.

## Export Paths

- `@gooi/render-contracts/ir`
- `@gooi/render-contracts/nodes`
- `@gooi/render-contracts/envelopes`
- `@gooi/render-contracts/adapter`
- `@gooi/render-contracts/refresh`

## Notes

- `@gooi/render-contracts` owns pure contracts only.
- Runtime/adapter packages must consume these contracts, not own render semantics.
