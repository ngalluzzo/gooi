# Progressive DX Facade Compatibility Policy

This policy defines compatibility and deprecation guarantees for progressive DX
facades (`@gooi/app`, `@gooi/app-runtime`, `@gooi/app-testing`,
`@gooi/app-marketplace`).

## Semver Policy

1. Facade packages are semantic aliases over canonical low-level APIs.
2. Facade major versions must remain compatible with referenced core package
   majors.
3. Feature-scoped exports are required; root `.` exports are disallowed.
4. Shared/public contract authority remains in `products/contracts/*`, not
   facade-local `src/contracts`.

## Deprecation Policy

1. Any breaking facade API change requires a major release.
2. Deprecated facade APIs require at least one minor-cycle notice before
   removal.
3. Deprecation messaging must map facade APIs to canonical low-level
   equivalents.

## Codemod Strategy

1. Codemods for facade breaking changes must ship in the dedicated
   `@gooi/migrate` boundary.
2. Each codemod must provide deterministic before/after rewrites for import
   paths and argument shape changes.
3. Migration docs and codemods must be published together for every breaking
   change.
