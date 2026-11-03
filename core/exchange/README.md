# @gooi/exchange

Execute an artifact operation and admit its evidence through `@gooi/kernel`.

```ts
import { invoke } from "@gooi/exchange";
import { compose } from "@gooi/kernel/compose";
import { csvArtifact } from "@gooi/csv";
import { csvToArrow } from "@gooi/csv-to-arrow";
import { arrowToCsv } from "@gooi/arrow-to-csv";

const source = csvArtifact("count\n9007199254740993\n", [
  { name: "count", type: "integer", nullable: false },
]);
const encoded = await invoke(csvToArrow, source);
const emitted = await invoke(arrowToCsv, encoded.artifact);
const traces = compose([encoded, emitted]);
```

CSV and Arrow own independent artifact contracts and native readers. Separately
publishable lowering packages supply the edges between them. The application
chooses the path; the exchange validates each execution and the kernel connects
its evidence. The exchange has no dependency on either format or lowering.

Run `bun run demo:csv-arrow` for the complete
[CSV → Arrow → CSV example](../../examples/csv-arrow/README.md), including its
artifact graph and evidence. Its claims cover typed content; CSV source spelling
may change.

The same interface reaches a live runtime in the
[Arrow → HTML → browser example](../../examples/arrow-browser/README.md).
The lowering returns a document; a browser adapter returns a mount receipt and
retains ownership of its native frame. Run `bun run demo:arrow-browser`.

`Implementation` pairs an `Operation` signature with
`run(input: Artifact): Promise<unknown>`. Normalize, transform, extract, and emit
can all use this interface; their contracts and implementations define their
meaning.

`edge({operation, claim, scope}, apply)` builds an `Implementation` whose result
carries one passed claim from the exact input to the output value `apply` returns.
It is a shorthand for the common case, not a different kind of edge.

An `Implementation` may declare `inputSchema`, a JSON Schema for its input value.
`invoke` checks it after the contract and before `run`, and throws `InputError`
naming the first problem (`Missing field: title`, `Unexpected field: x`). Surfaces
can read the same schema to describe their fields. The schema language is the
JSON Schema standard, checked with Ajv; gooi does not define its own.

`invoke(implementation, rawInput)` returns `Promise<Result>`. It admits and
deeply freezes detached copies of the signature and input, checks the exact
input contract before calling `run`, then admits the returned result against
those same copies. Caller mutations during asynchronous execution cannot change
the invocation's input or expected contracts. The result is also detached and
deeply frozen.

Admission failures use the kernel's `KernelError` and stable error codes. An
implementation's thrown error or rejected promise propagates unchanged. A valid
result containing `failed` or `unknown` claims is returned as evidence. The
caller decides whether that evidence is sufficient to accept the output.

Implementations supply domain validation, native observations, verdicts, and
witnesses. Admission checks their structure, identities, contracts, and artifact
pins; it does not establish the truth of their assertions. Implementations run
in the caller's process and may perform effects; result rejection does not undo
those effects.

The [effect-contract specification](./EFFECTS.md) defines what an effectful
operation must document and prove about authority, success, evidence, repetition,
uncertainty, and lifetime. It uses this same execution interface. Portable
[browser mount](../browser-mount/README.md) and [commit](../commit/README.md)
contracts supply their own guarantees and native conformance checks.

[Source reads](../source-read/README.md) use the same interface to observe an
authorized head. Each invocation may observe a newer revision; commit's exact
replay semantics do not apply to this operation.

Chain invocations by passing each `result.artifact` to the next implementation.
Pass the results to `compose` from `@gooi/kernel/compose` to connect evidence.
Adjacent claims must agree on their complete observation boundaries, including
artifact pins. The exchange leaves selection and sequencing to the caller.

From the workspace root:

```sh
bun install
bun run build
bun run typecheck
bun run test
```

The workspace build compiles the kernel before the exchange. Bun uses source
exports; other runtimes use the compiled ESM in `dist`.
