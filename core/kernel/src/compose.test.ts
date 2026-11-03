import { expect, test } from "bun:test";
import { compose } from "./compose.js";
import { EVIDENCE_LIMITS } from "./evidence.js";
import { KernelError } from "./errors.js";
import { type Stage, type Verdict } from "./types.js";
import { claim, reference } from "./evidence.fixtures.js";

const [a, b, c, d] = ["a", "b", "c", "d"].map(reference) as [
  ReturnType<typeof reference>,
  ReturnType<typeof reference>,
  ReturnType<typeof reference>,
  ReturnType<typeof reference>,
];

test("complete boundaries join in any order; partial overlap produces missing evidence", () => {
  const first = claim([a], [b, c]);
  expect(
    compose([{ claims: [first] }, { claims: [claim([c, b], [d])] }])[0],
  ).toMatchObject({
    verdict: "passed",
    firstIssueStage: null,
    missingStage: null,
  });
  const [partial] = compose([
    { claims: [first] },
    { claims: [claim([b], [d])] },
  ]);
  expect(partial).toMatchObject({
    verdict: "missing",
    firstIssueStage: 2,
    missingStage: 2,
  });
  expect(partial!.claims).toHaveLength(1);
});

test("branches retain distinct claims and witnesses without inventing one acceptance decision", () => {
  const pass = claim([b], [c], "passed", "Required outputs");
  const fail = claim([b], [d], "failed", "Numeric accuracy");
  const traces = compose([
    { claims: [claim([a], [b])] },
    { claims: [pass, fail] },
  ]);
  expect(traces.map((trace) => trace.verdict)).toEqual(["passed", "failed"]);
  expect(traces[0]!.claims[1]).toEqual(pass);
  expect(traces[1]!.claims[1]).toEqual(fail);
});

test("missing continuations cannot skip stages or be repaired by unrelated evidence", () => {
  const traces = compose([
    { claims: [claim([a], [b]), claim([a], [c])] },
    { claims: [claim([b], [d])] },
    { claims: [claim([c], [d]), claim([d], [a])] },
  ]);
  expect(
    traces.map((trace) => [
      trace.verdict,
      trace.missingStage,
      trace.claims.length,
    ]),
  ).toEqual([
    ["passed", null, 3],
    ["missing", 2, 1],
  ]);
  const [empty] = compose([
    { claims: [claim([a], [b])] },
    { claims: [] },
    { claims: [claim([b], [c])] },
  ]);
  expect(empty).toMatchObject({ verdict: "missing", missingStage: 2 });
  expect(empty!.claims).toHaveLength(1);
});

test("stale containing artifacts cannot join even when an observation identity matches", () => {
  const stale = { ...b, artifact: a.artifact };
  expect(
    compose([
      { claims: [claim([a], [b])] },
      { claims: [claim([stale], [c])] },
    ])[0]!.verdict,
  ).toBe("missing");
});

test("verdict precedence preserves the first issue and missing stage independently", () => {
  const cases: [Verdict, Verdict, boolean, string, number | null][] = [
    ["passed", "passed", false, "passed", null],
    ["passed", "unknown", false, "unknown", 2],
    ["unknown", "failed", false, "failed", 1],
    ["failed", "unknown", true, "failed", 1],
    ["passed", "passed", true, "missing", 3],
    ["passed", "unknown", true, "unknown", 2],
  ];
  for (const [first, second, missing, expected, issue] of cases) {
    const stages: Stage[] = [
      { claims: [claim([a], [b], first)] },
      { claims: [claim([b], [c], second)] },
    ];
    if (missing) stages.push({ claims: [] });
    expect(compose(stages)[0]).toMatchObject({
      verdict: expected,
      firstIssueStage: issue,
      missingStage: missing ? 3 : null,
    });
  }
});

test("disconnected malformed claims and malformed stages reject", () => {
  const forged = { ...claim([c], [d]), to: [{ ...d, value: "forged" }] };
  for (const stages of [
    [],
    [{ claims: [] }],
    [{ claims: null }],
    [null],
    [{}],
    [{ claims: [claim([a], [b])] }, { claims: [forged] }],
  ]) {
    expect(() => compose(stages as unknown as Stage[])).toThrow(KernelError);
  }
});

test("stages project only claims; attached metadata cannot change the verdict", () => {
  const result = { claims: [claim([a], [b], "unknown")], accepted: true };
  expect(compose([result])[0]!.verdict).toBe("unknown");
});

test("composition owns immutable traces even when callers mutate their inputs later", () => {
  const stages = structuredClone([{ claims: [claim([a], [b])] }]);
  const traces = compose(stages);
  stages[0]!.claims[0] = claim([a], [b], "failed");
  expect(traces[0]!.verdict).toBe("passed");
  expect(Object.isFrozen(traces)).toBe(true);
  expect(Object.isFrozen(traces[0]!.claims[0]!.from[0]!.value)).toBe(true);
  expect(() => (traces as unknown as unknown[]).push(null)).toThrow();
});

test("stage, claim and branch budgets refuse excessive expansion", () => {
  const self = claim([a], [a]);
  const line = Array.from({ length: EVIDENCE_LIMITS.stages }, () => ({
    claims: [self],
  }));
  expect(compose(line)[0]!.claims).toHaveLength(EVIDENCE_LIMITS.stages);
  expect(() => compose([...line, line[0]!])).toThrow("Too many stages");
  expect(() =>
    compose([{ claims: Array(EVIDENCE_LIMITS.claims + 1).fill(self) }]),
  ).toThrow("Too many claims");
  const branching = [
    { claims: Array(16).fill(self) },
    { claims: Array(17).fill(self) },
  ];
  expect(() => compose(branching)).toThrow("expansion");
});

test("expanded bytes are bounded even when stage inputs fit the input budget", () => {
  const self = { ...claim([a], [a]), witness: "x".repeat(40_000) };
  expect(() =>
    compose([
      { claims: Array(16).fill(self) },
      { claims: Array(16).fill(self) },
    ]),
  ).toThrow("expansion");
});

test("expanded claim occurrences are bounded without exceeding the trace count", () => {
  const self = claim([a], [a]);
  const stages = [
    { claims: Array(256).fill(self) },
    ...Array.from({ length: 64 }, () => ({ claims: [self] })),
  ];
  expect(() => compose(stages)).toThrow("expansion");
});
