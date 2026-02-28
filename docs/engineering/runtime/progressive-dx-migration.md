# Progressive DX Migration (L0 to L3)

This guide maps low-level APIs to progressive facade APIs without requiring
spec rewrites.

## Before/After Mappings

1. L0 parse
Low-level: `parseGooiAppSpec(spec)` from `@gooi/app-spec-contracts/spec`
Facade path: `defineApp({ spec })` from `@gooi/app/define`

2. L1 compile
Low-level: `compileEntrypointBundle({ spec, compilerVersion })` from `@gooi/spec-compiler`
Facade path: `compileApp({ definition, compilerVersion })` from `@gooi/app/compile`

3. L2 runtime invoke
Low-level: `runEntrypointThroughKernel({...})` from `@gooi/execution-kernel/entrypoint`
Facade path: `createAppRuntime({...}).invoke({...})` from `@gooi/app-runtime/create`

4. L3 scenario conformance
Low-level: `runScenarioConformance({...})` from `@gooi/conformance/scenario`
Facade path: `runAppScenarioConformance({ fixture })` from `@gooi/app-testing/scenario-runner`

## Migration Rule

Keep the same canonical spec/contracts/artifacts; move invocation sites from
low-level entrypoints to facade entrypoints incrementally.
