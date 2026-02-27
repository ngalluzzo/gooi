# RFC-0021 Export-Surface Unknown Audit (2026-02-27)

## Scope
This audit covers exported TypeScript source files referenced by `exports` in:
- `packages/*/package.json`
- `products/*/*/package.json`

Scan patterns:
- `: unknown`
- `Record<string, unknown>`
- `z.unknown()`
- `as unknown`
- generic defaults such as `= unknown`
- `ZodType<unknown>`

## Verification
- `bun typecheck`: pass across all workspaces
- `bun test`: pass across all workspaces (`209` passing tests)
- `bun docs:api`: pass (Typedoc warnings only, no hard errors)

## Remaining Usage Summary
Current exported-surface matches from the scan:

| Package | Match Count |
| --- | ---: |
| `@gooi/provider-manifest` | 5 |
| `@gooi/capability-contracts` | 5 |
| `@gooi/conformance-contracts` | 3 |
| `@gooi/binding` | 4 |
| `@gooi/app-spec-contracts` | 5 |
| `@gooi/surface-contracts` | 9 |
| `@gooi/host-contracts` | 12 |
| `@gooi/contract-primitives` | 4 |
| `@gooi/authoring-contracts` | 6 |
| `@gooi/artifact-model` | 3 |
| `@gooi/symbol-graph` | 3 |
| `@gooi/capability-index` | 1 |
| `@gooi/language-server` | 31 |
| `@gooi/spec-compiler` | 6 |
| `@gooi/guard-runtime` | 4 |
| `@gooi/projection-runtime` | 1 |
| `@gooi/surface-runtime` | 9 |
| `@gooi/domain-runtime` | 2 |
| `@gooi/conformance` | 2 |

## Intentional Categories
1. Parse boundaries for untrusted input.
Examples: `parse*` APIs in `provider-manifest`, `binding`, `app-spec-contracts`, `surface-contracts`, `authoring-contracts`, `artifact-model`, `symbol-graph`, `capability-index`, and protocol/session entry points in `language-server`.
Rationale: these are parser ingress points where runtime schema validation narrows unknown values.

2. Generic host extension points.
Examples: `host-contracts` replay/module-loader generics (`TResult`, `TModule`) defaulted to unknown.
Rationale: host adapters provide implementation-defined module/result shapes, so these remain intentionally generic.

3. Dynamic protocol envelopes and permissive transport shells.
Examples: `language-server` protocol `params`/`result`, code lens command arguments/data.
Rationale: protocol methods carry method-specific payloads; this remains an explicit extension surface.

4. Runtime dynamic evaluation contexts.
Examples: exported runtime APIs in `guard-runtime`, `projection-runtime`, `surface-runtime`, `domain-runtime` still accept broad context/input maps.
Rationale: these contexts are authored-data driven and evaluated at runtime via path expressions; narrowing is deferred to future dedicated runtime refactor scope.

5. Contract-primitives migration compatibility bridge.
Examples: `JsonObject`/`JsonArray` compatibility aliases and unknown parse-value ingress in `@gooi/contract-primitives`.
Rationale: explicitly retained to avoid blocking staged convergence while runtime validators (`z.json()`) enforce JSON-encodable values at parse boundaries.

6. Conformance negative-path adapter casting.
Example: `as unknown as` in conformance projection test path that intentionally strips methods to assert contract gate failures.
Rationale: deliberate test harness shape mutation for negative coverage.

## Policy
Any new exported `unknown` usage must be either:
- a parse boundary receiving untrusted external input, or
- an explicitly documented extension point with rationale.

All other newly introduced exported `unknown` patterns should be treated as regressions.
