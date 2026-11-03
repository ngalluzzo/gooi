import { artifact, observe, readOperation } from "@gooi/kernel/evidence";
import type { Artifact, Contract, Operation } from "@gooi/kernel/types";
import type { Implementation } from "./types.js";

export interface EdgeOptions {
  readonly operation: Operation;
  /** Contract of the one claim linking the exact input to its output. */
  readonly claim: Contract;
  /** What the claim asserts, and what it excludes. */
  readonly scope: string;
}

/** Build an edge whose result carries one passed claim from the exact input to
 * its output. `apply` returns the output value; its errors propagate. */
export function edge(
  options: EdgeOptions,
  apply: (input: Artifact) => unknown | Promise<unknown>,
): Implementation {
  const operation = readOperation(options.operation);
  return Object.freeze({
    operation,
    async run(input: Artifact) {
      const output = artifact(operation.output, await apply(input));
      return {
        artifact: output,
        claims: [
          {
            contract: options.claim,
            scope: options.scope,
            from: [observe(input, operation.input, "input", input.value)],
            to: [observe(output, operation.output, "output", output.value)],
            verdict: "passed",
            witness: null,
          },
        ],
      };
    },
  });
}
