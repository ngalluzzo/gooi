export type Value =
  | null
  | boolean
  | number
  | string
  | readonly Value[]
  | { readonly [key: string]: Value };
export type Digest = `sha256:${string}`;

/** An exact reference to published semantics; the kernel does not resolve it. */
export interface Contract {
  readonly id: string;
  readonly version: number;
}

export interface Artifact {
  readonly contract: Contract;
  readonly value: Value;
}

export interface Observation {
  readonly contract: Contract;
  readonly key: string;
  readonly value: Value;
  readonly id: Digest;
  readonly artifact: Digest;
}

export type Verdict = "passed" | "failed" | "unknown";

export interface Claim {
  readonly contract: Contract;
  readonly scope: string;
  readonly from: readonly Observation[];
  readonly to: readonly Observation[];
  readonly verdict: Verdict;
  readonly witness: Value;
}

export interface Operation {
  readonly input: Contract;
  readonly output: Contract;
}

export interface Result {
  readonly artifact: Artifact;
  readonly claims: readonly Claim[];
}

export interface Stage {
  readonly claims: readonly Claim[];
}

export interface Trace {
  readonly claims: readonly Claim[];
  readonly verdict: Verdict | "missing";
  /** One-based stage number, or null when all connected claims passed. */
  readonly firstIssueStage: number | null;
  readonly missingStage: number | null;
}
