import type { Artifact, Operation, Value } from "@gooi/kernel/types";

/** Executable behavior paired with its exact input/output contract signature. */
export interface Implementation {
  readonly operation: Operation;
  /** Optional JSON Schema for the input artifact's value. invoke checks it before run. */
  readonly inputSchema?: Value;
  /** Return decoded evidence for admission by invoke. Execution errors propagate. */
  run(input: Artifact): Promise<unknown>;
}
