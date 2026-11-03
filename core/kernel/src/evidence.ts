import { snapshot } from "./data.js";
import { ensure } from "./assert.js";
import { digestSnapshot } from "./identity.js";
import {
  fields,
  text,
  contract,
  sameContract,
  observationId,
  observation,
  boundary,
} from "./evidence-validation.js";
import type {
  Artifact,
  Claim,
  Contract,
  Digest,
  Observation,
  Operation,
  Result,
  Value,
} from "./types.js";

export function readArtifact(value: unknown): Artifact {
  const v = fields(snapshot(value), ["contract", "value"]);
  contract(v.contract!);
  return v as unknown as Artifact;
}
export function artifact(type: Contract, value: unknown): Artifact {
  return readArtifact({ contract: type, value });
}
export function artifactId(value: Artifact): Digest {
  const a = readArtifact(value);
  return digestSnapshot({
    kind: "gooi.artifact/1",
    contract: a.contract as unknown as Value,
    value: a.value,
  });
}
/** The caller supplies the native observation; construction is not verification of its truth. */
export function observe(
  subject: Artifact,
  type: Contract,
  key: string,
  value: unknown,
): Observation {
  const meaning = snapshot({ contract: type, key, value }) as unknown as Pick<
    Observation,
    "contract" | "key" | "value"
  >;
  return readObservation({
    ...meaning,
    id: observationId(meaning),
    artifact: artifactId(subject),
  });
}
export function readObservation(value: unknown): Observation {
  return observation(snapshot(value));
}

export function sameBoundary(
  left: readonly Observation[],
  right: readonly Observation[],
): boolean {
  return boundary(snapshot(left)) === boundary(snapshot(right));
}
export function readClaim(value: unknown): Claim {
  const v = fields(snapshot(value), [
    "contract",
    "scope",
    "from",
    "to",
    "verdict",
    "witness",
  ]);
  contract(v.contract!);
  text(v.scope, "claim scope");
  boundary(v.from!);
  boundary(v.to!);
  ensure(
    v.verdict === "passed" || v.verdict === "failed" || v.verdict === "unknown",
    "invalid-envelope",
    "Invalid claim verdict",
  );
  return v as unknown as Claim;
}

/** Admit and own an exact input/output contract signature. */
export function readOperation(value: unknown): Operation {
  const v = fields(snapshot(value), ["input", "output"]);
  contract(v.input!);
  contract(v.output!);
  return v as unknown as Operation;
}

/** Check generic evidence against the actual invocation; native semantics remain with the caller. */
export function readResult(
  value: unknown,
  operation: Operation,
  input: Artifact,
): Result {
  const signature = readOperation(operation);
  const source = readArtifact(input),
    v = fields(snapshot(value), ["artifact", "claims"]);
  const output = readArtifact(v.artifact!);
  ensure(
    sameContract(source.contract, signature.input) &&
      sameContract(output.contract, signature.output),
    "contract-mismatch",
    "Invocation artifact contracts differ from the operation",
  );
  ensure(
    Array.isArray(v.claims) && v.claims.length > 0,
    "invalid-envelope",
    "A result must contain claims",
  );
  const claims = v.claims.map(readClaim),
    from = artifactId(source),
    to = artifactId(output);
  for (const claim of claims) {
    ensure(
      claim.from.every((ref) => ref.artifact === from) &&
        claim.to.every((ref) => ref.artifact === to),
      "boundary-mismatch",
      "Claim boundaries must pin the invocation's exact input and output artifacts",
    );
  }
  return Object.freeze({ artifact: output, claims: Object.freeze(claims) });
}

export const EVIDENCE_LIMITS = Object.freeze({
  stages: 128,
  claims: 1024,
  traces: 256,
  traceClaims: 16_384,
  bytes: 8 * 1024 * 1024,
});
