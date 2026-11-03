import { artifact, observe, readClaim } from "./evidence.js";
import {
  type Claim,
  type Contract,
  type Observation,
  type Verdict,
} from "./types.js";

export const type: Contract = { id: "urn:test:document", version: 1 };
export const fact: Contract = { id: "urn:test:fact", version: 1 };
export const rule: Contract = { id: "urn:test:preservation", version: 1 };
export function reference(key: string): Observation {
  return observe(artifact(type, { name: key }), fact, key, { name: key });
}
export function claim(
  from: readonly Observation[],
  to: readonly Observation[],
  verdict: Verdict = "passed",
  scope = "Selected facts",
): Claim {
  return readClaim({
    contract: rule,
    scope,
    from,
    to,
    verdict,
    witness: { reason: "Fixture observation" },
  });
}
