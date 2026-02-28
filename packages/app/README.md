# @gooi/app

Progressive DX declarative facade over canonical Gooi authoring + compile primitives.

## Exports

- `@gooi/app/define`
- `@gooi/app/compile`

## Escape Hatch Mapping

Facade operations are thin wrappers over canonical low-level primitives:

1. `defineApp` -> `@gooi/app-spec-contracts/spec` `parseGooiAppSpec`
2. `compileApp` -> `@gooi/spec-compiler` `compileEntrypointBundle`

Direct low-level usage remains fully supported and is parity-tested against
facade outputs.
