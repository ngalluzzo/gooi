import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  artifact,
  artifactId,
  observe,
  readArtifact,
  readObservation,
  readClaim,
  readOperation,
  readResult,
  sameBoundary,
} from "./evidence.js";
import { KernelError } from "./errors.js";
import { VALUE_LIMITS } from "./data.js";
import { type Contract } from "./types.js";
import { claim, fact, reference, rule, type } from "./evidence.fixtures.js";

test("every admitted artifact remains identifiable at the input byte limit", () => {
  const overhead = JSON.stringify({ contract: type, value: "" }).length;
  const a = artifact(type, "a".repeat(VALUE_LIMITS.bytes - overhead));
  expect(() => artifactId(a)).not.toThrow();
  expect(() =>
    artifact(type, "a".repeat(VALUE_LIMITS.bytes - overhead + 1)),
  ).toThrow("byte limit");
});

test("artifact and observation identities have explicit independent canonical inputs", () => {
  const a = artifact(type, { title: "A" });
  const expected =
    '{"contract":{"id":"urn:test:document","version":1},"kind":"gooi.artifact/1","value":{"title":"A"}}';
  expect(artifactId(a)).toBe(
    `sha256:${createHash("sha256").update(expected).digest("hex")}`,
  );
  const o = observe(a, fact, "title", "A");
  const observed =
    '{"contract":{"id":"urn:test:fact","version":1},"key":"title","kind":"gooi.observation/1","value":"A"}';
  expect(o.id).toBe(
    `sha256:${createHash("sha256").update(observed).digest("hex")}`,
  );
  expect(o.artifact).toBe(artifactId(a));
});

test("unchanged observations preserve meaning while changed artifacts prevent evidence joins", () => {
  const a = artifact(type, { title: "A", body: "first" }),
    b = artifact(type, { title: "A", body: "second" });
  const left = observe(a, fact, "title", "A"),
    right = observe(b, fact, "title", "A");
  expect(left.id).toBe(right.id);
  expect(left.artifact).not.toBe(right.artifact);
  expect(sameBoundary([left], [right])).toBe(false);
  expect(observe(a, fact, "another-title", "A").id).not.toBe(left.id);
  expect(observe(a, { ...fact, version: 2 }, "title", "A").id).not.toBe(
    left.id,
  );
});

test("readers admit plain envelopes, own their data, and reject ambiguous fields", () => {
  expect(readArtifact({ contract: type, value: null })).toEqual(
    artifact(type, null),
  );
  for (const value of [
    { contract: type },
    { contract: type, value: null, extra: 1 },
    { "contract\0value": null },
    { contract: { ...type, extra: 1 }, value: null },
  ])
    expect(() => readArtifact(value)).toThrow(KernelError);
  const original = { contract: type, value: { x: 1 } },
    saved = readArtifact(original);
  original.value.x = 2;
  expect(saved.value).toEqual({ x: 1 });
  expect(Object.isFrozen(saved.contract)).toBe(true);
});

test("contract references require exact namespaced identities and positive safe versions", () => {
  for (const id of [
    "plain",
    "urn:",
    "urn:test\n",
    "urn:test\0",
    " urn:test",
    "urn:two words",
    "",
    "x".repeat(1025),
  ]) {
    expect(() => artifact({ id, version: 1 }, null)).toThrow(KernelError);
  }
  for (const version of [0, -1, 1.1, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => artifact({ ...type, version }, null)).toThrow(KernelError);
  }
  expect(
    artifact({ ...type, version: Number.MAX_SAFE_INTEGER }, null),
  ).toBeDefined();
});

test("observations reject tampering, malformed digests, empty keys and extra fields", () => {
  const o = reference("a");
  for (const change of [
    { value: "changed" },
    { key: "changed" },
    { contract: { ...fact, version: 2 } },
    { id: o.id + "\n" },
    { artifact: o.artifact + "\n" },
    { id: "sha256:" + "0".repeat(64) },
    { artifact: "arbitrary" },
    { key: "" },
    { extra: true },
  ]) {
    expect(() => readObservation({ ...o, ...change })).toThrow(KernelError);
  }
});

test("boundaries require unique complete membership but ignore ordering", () => {
  const a = reference("a"),
    b = reference("b");
  expect(sameBoundary([a, b], [b, a])).toBe(true);
  expect(sameBoundary([a, b], [a])).toBe(false);
  expect(() => sameBoundary([], [])).toThrow(KernelError);
  expect(() => sameBoundary([a, a], [a])).toThrow(KernelError);
});

test("claims retain scopes, witnesses and all three verdicts; missing is not a claim verdict", () => {
  const c = claim([reference("a")], [reference("b")]);
  for (const verdict of ["passed", "failed", "unknown"] as const)
    expect(readClaim({ ...c, verdict }).verdict).toBe(verdict);
  for (const change of [
    { verdict: "missing" },
    { scope: " " },
    { from: [] },
    { to: [] },
    { contract: { id: "bad", version: 1 } },
    { witness: undefined },
    { extra: 1 },
  ])
    expect(() => readClaim({ ...c, ...change })).toThrow(KernelError);
  expect(Object.isFrozen(c.witness)).toBe(true);
});

test("operation admission owns and freezes both contract references", () => {
  const original = { input: { ...type }, output: { ...fact } };
  const saved = readOperation(original);
  original.input.version++;
  original.output.id = "urn:test:changed";
  expect(saved).toEqual({ input: type, output: fact });
  expect(Object.isFrozen(saved)).toBe(true);
  expect(Object.isFrozen(saved.input)).toBe(true);
  expect(Object.isFrozen(saved.output)).toBe(true);
});

test("operation admission rejects malformed signatures before execution", () => {
  for (const value of [
    null,
    {},
    { input: type },
    { input: type, output: fact, extra: true },
    { input: { ...type, version: 0 }, output: fact },
    { input: type, output: { ...fact, id: "invalid" } },
  ]) {
    expect(() => readOperation(value)).toThrow(KernelError);
  }
  let reads = 0;
  const accessor = Object.defineProperty({ output: fact }, "input", {
    enumerable: true,
    get() {
      reads++;
      return type;
    },
  });
  expect(() => readOperation(accessor)).toThrow("data properties");
  expect(reads).toBe(0);
});

test("result admission binds every claim to the actual invocation contracts and artifacts", () => {
  const outputType: Contract = { id: "urn:test:rendered", version: 1 };
  const input = artifact(type, { title: "A" }),
    output = artifact(outputType, "<h1>A</h1>");
  const c = claim(
    [observe(input, fact, "title", "A")],
    [observe(output, fact, "title", "A")],
  );
  const operation = { input: type, output: outputType },
    result = { artifact: output, claims: [c] };
  expect(readResult(result, operation, input)).toEqual(result);
  expect(() =>
    readResult(result, { ...operation, input: { ...type, version: 2 } }, input),
  ).toThrow("contracts differ");
  expect(() =>
    readResult(result, { ...operation, output: type }, input),
  ).toThrow("contracts differ");
  expect(() =>
    readResult(result, operation, artifact(type, { title: "B" })),
  ).toThrow("exact input");
  expect(() =>
    readResult(
      { ...result, artifact: artifact(outputType, "changed") },
      operation,
      input,
    ),
  ).toThrow("exact input");
  expect(() => readResult({ ...result, claims: [] }, operation, input)).toThrow(
    "must contain claims",
  );
  expect(() =>
    readResult({ error: "process failed" }, operation, input),
  ).toThrow(KernelError);
  expect(() =>
    readResult(
      { ...result, claims: [c, claim([reference("wrong")], c.to)] },
      operation,
      input,
    ),
  ).toThrow(KernelError);
  // Kernel admission establishes consistency, not the truth of supplied native observations.
  const asserted = claim(
    [observe(input, fact, "title", "unverified")],
    c.to,
    "unknown",
  );
  expect(
    readResult({ ...result, claims: [asserted] }, operation, input).claims[0]!
      .verdict,
  ).toBe("unknown");
});

test("result readers never trust TypeScript types or mutable invocation objects", () => {
  const a = artifact(type, { x: 1 }),
    o = observe(a, fact, "x", 1);
  const result = { artifact: a, claims: [claim([o], [o])] },
    op = { input: { ...type }, output: { ...type } };
  readResult(result, op, a);
  op.output.version++;
  expect(() => readResult(result, op, a)).toThrow(KernelError);
  const accessor = Object.defineProperty({}, "input", {
    enumerable: true,
    get() {
      throw Error("must not run");
    },
  });
  expect(() => readResult(result, accessor as typeof op, a)).toThrow(
    "data properties",
  );
});

test("claim contracts are separate from observed value contracts", () => {
  const c = claim([reference("a")], [reference("b")]);
  expect(c.contract).toEqual(rule);
  expect(c.from[0]!.contract).toEqual(fact);
});
