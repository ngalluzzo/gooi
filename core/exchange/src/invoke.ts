import { readArtifact, readOperation, readResult } from "@gooi/kernel/evidence";
import { KernelError } from "@gooi/kernel/errors";
import type { Artifact, Operation, Result } from "@gooi/kernel/types";
import { checkInput } from "./schema.js";
import type { Implementation } from "./types.js";

export type { Implementation } from "./types.js";
export { edge, type EdgeOptions } from "./edge.js";
export { InputError } from "./schema.js";

/** Execute once against owned inputs and admit the result without choosing an acceptance policy. */
export async function invoke(
  implementation: Implementation,
  rawInput: unknown,
): Promise<Result> {
  const operation = readOperation(implementation.operation);
  const input = readArtifact(rawInput);
  assertInputContract(input, operation);
  if (implementation.inputSchema !== undefined)
    checkInput(implementation.inputSchema, input.value);
  const result = await implementation.run(input);
  return readResult(result, operation, input);
}

function assertInputContract(input: Artifact, operation: Operation): void {
  if (
    input.contract.id !== operation.input.id ||
    input.contract.version !== operation.input.version
  ) {
    throw new KernelError(
      "contract-mismatch",
      "Input artifact contract differs from the operation",
    );
  }
}
