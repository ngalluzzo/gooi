import type { Artifact, Operation } from "@gooi/kernel/types";

/** Executable behavior paired with its exact input/output contract signature. */
export interface Implementation {
  readonly operation: Operation;
  /** Return decoded evidence for admission by invoke. Execution errors propagate. */
  run(input: Artifact): Promise<unknown>;
}
