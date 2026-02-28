# Surface Extension Checklist

Use this checklist when adding a new surface adapter to verify extension-readiness
without changing surface runtime semantics.

## Checklist

1. Adapter-only extension path:
   - Register the new adapter via `createSurfaceAdapterRegistry([...defaultSurfaceAdapters, extensionAdapter])`.
   - Reuse compiled dispatch plans, entrypoints, and bindings as-is.
   - Automated check id: `adapter_extension_without_core_changes`.
2. Typed failure diagnostics:
   - Malformed extension ingress must return `dispatch_transport_error`.
   - Automated check id: `typed_extension_failure_diagnostics`.
3. Deterministic dispatch outcomes:
   - Repeated equivalent ingress requests must produce equivalent dispatch snapshots.
   - Automated check id: `deterministic_extension_dispatch`.

## Test-Backed Evidence

- Reusable suite:
  - `@gooi/conformance/surface-extension`
  - contracts: `@gooi/conformance/surface-extension-contracts`
- Template fixture:
  - [surface-extension-conformance.template.fixture.ts](/Users/ngalluzzo/repos/gooi/products/quality/conformance/test/fixtures/surface-extension-conformance.template.fixture.ts)
- Template test:
  - [surface-extension-conformance.test.ts](/Users/ngalluzzo/repos/gooi/products/quality/conformance/test/surface-extension-conformance.test.ts)

Run:

```sh
bun test products/quality/conformance/test/surface-extension-conformance.test.ts
```
