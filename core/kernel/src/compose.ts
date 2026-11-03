import { ensure } from "./assert.js";
import { canonical, snapshot } from "./data.js";
import { EVIDENCE_LIMITS, readClaim } from "./evidence.js";
import { boundary } from "./evidence-validation.js";
import type { Claim, Stage, Trace, Value, Verdict } from "./types.js";

function rank(verdict: Verdict): number {
  switch (verdict) {
    case "passed":
      return 0;
    case "unknown":
      return 1;
    case "failed":
      return 2;
  }
  const unreachable: never = verdict;
  throw new Error(`Unknown verdict: ${unreachable}`);
}

/** Compose connected evidence, preserving every scoped claim and incomplete continuation. */
export function compose(value: readonly Stage[]): readonly Trace[] {
  const stages = readStages(value);
  ensure(
    stages[0]!.length > 0,
    "invalid-envelope",
    "The initial stage must contain claims",
  );
  type Pending = {
    claims: readonly Claim[];
    missing: number | null;
    bytes: number;
  };
  let active: Pending[] = [];
  for (const [index, stage] of stages.entries()) {
    const candidates = new Map<string, { claim: Claim; bytes: number }[]>();
    for (const claim of stage) {
      const signature = boundary(claim.from as unknown as Value),
        group = candidates.get(signature) ?? [];
      group.push({ claim, bytes: claimBytes(claim) });
      candidates.set(signature, group);
    }
    const next: Pending[] = [];
    let bytes = 0,
      claims = 0;
    function append(
      prior: Pending,
      candidate?: { claim: Claim; bytes: number },
    ) {
      const size = prior.bytes + (candidate?.bytes ?? 0),
        count = prior.claims.length + Number(Boolean(candidate));
      bytes += size;
      claims += count;
      ensure(
        next.length < EVIDENCE_LIMITS.traces &&
          claims <= EVIDENCE_LIMITS.traceClaims &&
          bytes <= EVIDENCE_LIMITS.bytes,
        "limit-exceeded",
        "Evidence trace expansion exceeds its limits",
      );
      next.push({
        claims: candidate ? [...prior.claims, candidate.claim] : prior.claims,
        missing: candidate ? null : (prior.missing ?? index + 1),
        bytes: size,
      });
    }
    if (index === 0) {
      for (const claim of stage)
        append(
          { claims: [], missing: null, bytes: 0 },
          { claim, bytes: claimBytes(claim) },
        );
    } else {
      for (const prior of active) {
        const matches =
          prior.missing === null
            ? candidates.get(
                boundary(prior.claims.at(-1)!.to as unknown as Value),
              )
            : undefined;
        if (matches) for (const candidate of matches) append(prior, candidate);
        else append(prior);
      }
    }
    active = next;
  }
  return Object.freeze(
    active.map(({ claims, missing }): Trace => {
      const first = claims.findIndex((claim) => claim.verdict !== "passed");
      const strongest = claims.reduce<Verdict>(
        (current, claim) =>
          rank(claim.verdict) > rank(current) ? claim.verdict : current,
        "passed",
      );
      return Object.freeze({
        claims: Object.freeze(claims),
        missingStage: missing,
        firstIssueStage: first < 0 ? missing : first + 1,
        verdict:
          strongest === "passed" && missing !== null ? "missing" : strongest,
      });
    }),
  );
}

type RecordValue = { readonly [key: string]: Value };
function readStages(value: unknown): readonly (readonly Claim[])[] {
  const stages = snapshot(value);
  ensure(
    Array.isArray(stages) && stages.length > 0,
    "invalid-envelope",
    "Composition requires stages",
  );
  ensure(
    stages.length <= EVIDENCE_LIMITS.stages,
    "limit-exceeded",
    "Too many stages",
  );
  let count = 0;
  return stages.map((stage) => {
    // A stage projects claims from a result or another admitted record. Its other
    // metadata has no role in evidence composition or invocation validation.
    ensure(
      stage !== null && typeof stage === "object" && !Array.isArray(stage),
      "invalid-envelope",
      "Expected a stage record",
    );
    const v = stage as RecordValue;
    ensure(
      Array.isArray(v.claims),
      "invalid-envelope",
      "Stage claims must be an array",
    );
    ensure(
      (count += v.claims.length) <= EVIDENCE_LIMITS.claims,
      "limit-exceeded",
      "Too many claims",
    );
    return v.claims.map(readClaim);
  });
}

function claimBytes(claim: Claim): number {
  return new TextEncoder().encode(canonical(claim)).length;
}
