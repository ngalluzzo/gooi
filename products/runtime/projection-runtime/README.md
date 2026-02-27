# @gooi/projection-runtime

Deterministic projection strategy executor for join, aggregate, and timeline
query semantics.

## Features

- One canonical projection execution entrypoint
- Explicit strategy dispatch with typed plans
- Deterministic join/aggregate ordering and tie handling
- Timeline history operation contract gating (`append/scan/rebuild/persist`, optional `scan_as_of`)
- Timeline history-window scanning, dedupe, and as-of capability gating
- Timeline accumulation drift fail-fast gate with explicit rebuild workflow
- Timeline signal migration-chain replay before reducer evaluation
- Stable page metadata and timeline lifecycle metadata
- Typed projection diagnostics with source references
- Refresh impact resolver for signal-to-query invalidation parity

## API

- `createProjectionRuntime()`
- `ProjectionRuntime.executeProjection(input)`
- `ProjectionRuntime.rebuildTimelineProjection(input)`
- `resolveProjectionRefreshImpact(subscriptions, emittedSignalIds)`
