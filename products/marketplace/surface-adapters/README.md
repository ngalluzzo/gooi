# @gooi-marketplace/surface-adapters

Marketplace-owned reference surface adapter executors.

These adapters are transport shells only: they normalize ingress, dispatch and
bind through `@gooi/surface-runtime`, and invoke a provided app runtime.

## Feature Entry Points

- `@gooi-marketplace/surface-adapters/http`
- `@gooi-marketplace/surface-adapters/cli`
- `@gooi-marketplace/surface-adapters/web`
- `@gooi-marketplace/surface-adapters/webhook`

## Boundary Rule

No domain, projection, access policy, or provider-selection semantics are
implemented here.
