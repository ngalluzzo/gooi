import { artifact, artifactId, observe, readOperation } from "@gooi/kernel/evidence";
import { snapshot } from "@gooi/kernel/value";
import type { Artifact, Contract, Operation, Value } from "@gooi/kernel/types";
import type { Implementation } from "./types.js";

export interface EdgeOptions {
  readonly operation: Operation;
  /** JSON Schema for the input value; invoke checks it before apply runs. */
  readonly inputSchema?: Value;
  /** Contract of the one claim linking the exact input to its output. */
  readonly claim: Contract;
  /** What the claim asserts, and what it excludes. */
  readonly scope: string;
  /** Pin the exact artifacts by ID when the trace doesn't need their inline values. */
  readonly observations?: "artifact-id";
}

/** Build an edge whose result carries one passed claim from the exact input to
 * its output. `apply` returns the output value; its errors propagate. */
export function edge(
  options: EdgeOptions,
  apply: (input: Artifact) => unknown | Promise<unknown>,
): Implementation {
  const operation = readOperation(options.operation);
  const boundary = options.observations === "artifact-id"
    ? (subject: Artifact, contract: Contract) => observe(subject, contract, "artifact-id", artifactId(subject))
    : (subject: Artifact, contract: Contract) => observe(subject, contract, "value", subject.value);
  return Object.freeze({
    operation,
    ...(options.inputSchema === undefined
      ? {}
      : { inputSchema: snapshot(options.inputSchema) }),
    async run(input: Artifact) {
      const output = artifact(operation.output, await apply(input));
      return {
        artifact: output,
        claims: [
          {
            contract: options.claim,
            scope: options.scope,
            // One key on both ends, so one edge's output observation is the
            // next edge's input observation and compose can connect them.
            from: [boundary(input, operation.input)],
            to: [boundary(output, operation.output)],
            verdict: "passed",
            witness: null,
          },
        ],
      };
    },
  });
}
