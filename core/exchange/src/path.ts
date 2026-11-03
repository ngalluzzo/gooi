import { compose } from "@gooi/kernel/compose";
import { observe, readOperation } from "@gooi/kernel/evidence";
import type { Artifact, Contract, Result } from "@gooi/kernel/types";
import { invoke } from "./invoke.js";
import type { Implementation } from "./types.js";

const PATH = Object.freeze({ id: "urn:gooi:exchange:path", version: 1 });
const same = (a: Contract, b: Contract) => a.id === b.id && a.version === b.version;
const show = (c: Contract) => `${c.id}@${c.version}`;

/** Run connected edges as one edge: each step's output is the next step's
 * input. The path takes the first step's input schema, and its one claim
 * carries the composed trace of every step's claims as its witness. */
export function path(...steps: Implementation[]): Implementation {
  if (!steps.length) throw new Error("A path needs at least one edge");
  steps.forEach((step, i) => {
    const before = steps[i - 1];
    if (before && !same(before.operation.output, step.operation.input))
      throw new Error(
        `Step ${i + 1} takes ${show(step.operation.input)} but step ${i} gives ${show(before.operation.output)}`,
      );
  });
  const operation = readOperation({
    input: steps[0]!.operation.input,
    output: steps.at(-1)!.operation.output,
  });
  const inputSchema = steps[0]!.inputSchema;
  return Object.freeze({
    operation,
    ...(inputSchema === undefined ? {} : { inputSchema }),
    async run(input: Artifact) {
      const results: Result[] = [];
      let current = input;
      for (const step of steps) {
        const result = await invoke(step, current);
        results.push(result);
        current = result.artifact;
      }
      const traces = compose(results);
      const verdict = traces.every((t) => t.verdict === "passed")
        ? "passed"
        : traces.some((t) => t.verdict === "failed")
          ? "failed"
          : "unknown";
      return {
        artifact: current,
        claims: [
          {
            contract: PATH,
            scope: `Ran ${steps.length} edges in order, each output feeding the next; the witness is their composed trace`,
            from: [observe(input, operation.input, "value", input.value)],
            to: [observe(current, operation.output, "value", current.value)],
            verdict,
            witness: traces,
          },
        ],
      };
    },
  });
}
