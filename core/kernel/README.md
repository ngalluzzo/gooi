# @gooi/kernel

A small, synchronous library for identity and evidence. Its functions admit
decoded data, return immutable values, and compose claims across exact boundaries.
Domain code supplies the meaning of contracts and observations. The kernel has
no I/O or execution behavior.

```ts
import {
  artifact,
  artifactId,
  observe,
  sameBoundary,
} from "@gooi/kernel/evidence";

const component = { id: "urn:example:component", version: 1 };
const inputs = { id: "urn:example:required-inputs", version: 1 };
const a = artifact(component, { tag: "h1", required: ["title"] });
const b = artifact(component, { tag: "h2", required: ["title"] });
const before = observe(a, inputs, "summary", { required: ["title"] });
const after = observe(b, inputs, "summary", { required: ["title"] });

before.id === after.id; // true: the same addressed observation
artifactId(a) === artifactId(b); // false: different content
sameBoundary([before], [after]); // false: different exact origins
```

An observation is an assertion supplied by a native reader. Construction and
hash validation do not establish its truth. Contract-specific validation and
independent checks remain necessary.

| API                                      | Responsibility                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `snapshot`, `canonical`, `digest`        | Admit and own JSON values; encode canonical bytes; compute SHA-256 identity.                     |
| `artifact`, `readArtifact`, `artifactId` | Construct, admit, and identify values under exact contract references.                           |
| `observe`, `readObservation`             | Identify a named observation and pin its containing artifact.                                    |
| `readClaim`                              | Admit a scoped claim, its complete boundaries, verdict, and witness.                             |
| `readOperation`                          | Admit and own exact input/output contract references before execution.                           |
| `readResult`                             | Bind every claim to the invocation's actual input/output artifacts and contracts.                |
| `sameBoundary`                           | Compare complete unordered sets of observation identities and artifact pins.                     |
| `compose`                                | Join ordered stages, preserve branches, and report passed, failed, unknown, or missing evidence. |

Every reader accepts untrusted decoded values and returns detached, deeply frozen
data. Refusals throw `KernelError` with a stable `code`; messages are explanatory.
The module also exports its data types, `VALUE_LIMITS`, and `EVIDENCE_LIMITS`.

Composition does not supply an acceptance policy. A passed trace covers only its
included scoped claims. Validate invocation results with `readResult` before
composition, and independently require the claims and coverage your application
needs. A process failure without a result cannot be supplied as claim evidence.

Input is bounded plain JSON. Wire decoders must reject duplicate names and invalid
UTF-8 before constructing values. The kernel rejects malformed Unicode, nonfinite
numbers, cycles, sparse arrays, accessors, hidden properties, and class instances.
It does not execute serialization hooks; JavaScript proxies are outside the input
contract. Exact numeric domains beyond binary64 need explicit representations.

Canonical encoding follows RFC 8785. Artifact identities hash
`{kind: "gooi.artifact/1", contract, value}`; observation identities hash
`{kind: "gooi.observation/1", contract, key, value}`. A join additionally requires
the same containing-artifact digest. Neither identity authenticates a publisher.

From the workspace root:

```sh
bun run --cwd core/kernel build
bun run --cwd core/kernel typecheck
bun run --cwd core/kernel test
```
