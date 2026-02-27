# @gooi/projection-runtime

Deterministic projection strategy executor for join, aggregate, and timeline
query semantics.

## Features

- One canonical projection execution entrypoint
- Explicit strategy dispatch with typed plans
- Deterministic join/aggregate ordering and tie handling
- Timeline history-window scanning, dedupe, and as-of capability gating
- Stable page metadata and timeline lifecycle metadata
- Typed projection diagnostics with source references
- Refresh impact resolver for signal-to-query invalidation parity

## API

- `createProjectionRuntime()`
- `ProjectionRuntime.executeProjection(input)`
- `resolveProjectionRefreshImpact(subscriptions, emittedSignalIds)`
