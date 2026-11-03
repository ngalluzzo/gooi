import { expect, test } from "bun:test";
import { compose } from "@gooi/kernel/compose";
import { artifact, observe } from "@gooi/kernel/evidence";
import type { Artifact, Operation, Result, Verdict } from "@gooi/kernel/types";
import { invoke, type Implementation } from "./invoke.js";

const document = { id: "urn:test:document", version: 1 };
const rendered = { id: "urn:test:rendered", version: 1 };
const content = { id: "urn:test:content", version: 1 };
const relation = { id: "urn:test:transformation", version: 1 };
const source = artifact(document, { title: "A" });
const output = artifact(rendered, "A");
const operation = { input: document, output: rendered };

function result(
  input: Artifact,
  target: Artifact = output,
  verdict: Verdict = "passed",
): Result {
  return {
    artifact: target,
    claims: [
      {
        contract: relation,
        scope: "Fixture transformation",
        from: [observe(input, content, "content", input.value)],
        to: [observe(target, content, "content", target.value)],
        verdict,
        witness: { reason: "Fixture evidence" },
      },
    ],
  };
}

function gate() {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release };
}

test("input contract IDs and versions must match before implementation code runs", async () => {
  let calls = 0;
  const implementation: Implementation = {
    operation,
    async run(input) {
      calls++;
      return result(input);
    },
  };
  for (const contract of [rendered, { ...document, version: 2 }]) {
    await expect(
      invoke(implementation, artifact(contract, null)),
    ).rejects.toMatchObject({ code: "contract-mismatch" });
  }
  expect(calls).toBe(0);
});

test("malformed signatures and input data reject before execution", async () => {
  let calls = 0;
  const run = async (input: Artifact) => {
    calls++;
    return result(input);
  };
  for (const invalid of [
    {},
    { input: document },
    { ...operation, output: { ...rendered, version: 0 } },
    { ...operation, extra: true },
  ]) {
    await expect(
      invoke({ operation: invalid as Operation, run }, source),
    ).rejects.toMatchObject({ code: "invalid-envelope" });
  }
  await expect(
    invoke({ operation, run }, { contract: document }),
  ).rejects.toMatchObject({ code: "invalid-envelope" });
  let reads = 0;
  const input = Object.defineProperty({ contract: document }, "value", {
    enumerable: true,
    get() {
      reads++;
      return "A";
    },
  });
  await expect(invoke({ operation, run }, input)).rejects.toMatchObject({
    code: "invalid-value",
  });
  expect(calls).toBe(0);
  expect(reads).toBe(0);
});

test("in-flight invocations own their input and signature across asynchronous execution", async () => {
  const input = { contract: { ...document }, value: { title: "A" } };
  const signature = structuredClone(operation);
  const { pending, release } = gate();
  let received: Artifact | undefined;
  const invocation = invoke(
    {
      operation: signature,
      async run(admitted) {
        received = admitted;
        await pending;
        return result(admitted);
      },
    },
    input,
  );
  input.value.title = "changed";
  input.contract.version++;
  signature.input.version++;
  signature.output.version++;
  release();
  const admitted = await invocation;
  expect(received).toEqual(source);
  expect(received).not.toBe(input);
  expect(Object.isFrozen(received)).toBe(true);
  expect(Object.isFrozen(received!.value)).toBe(true);
  expect(Object.isFrozen(received!.contract)).toBe(true);
  expect(admitted.claims[0]!.from[0]!.value).toEqual({ title: "A" });
});

test("signature mutation cannot authorize a different output contract mid-flight", async () => {
  const signature = structuredClone(operation);
  const { pending, release } = gate();
  const invocation = invoke(
    {
      operation: signature,
      async run(input) {
        await pending;
        return result(input, artifact(signature.output, "A"));
      },
    },
    source,
  );
  signature.output.version++;
  release();
  await expect(invocation).rejects.toMatchObject({ code: "contract-mismatch" });
});

test("returned evidence is detached and deeply frozen", async () => {
  const original = result(source);
  const raw = {
    ...original,
    claims: original.claims.map((claim) => ({
      ...claim,
      witness: { reason: "Fixture evidence" },
    })),
  };
  const admitted = await invoke({ operation, run: async () => raw }, source);
  raw.artifact = artifact(rendered, "changed");
  raw.claims[0]!.verdict = "failed";
  raw.claims[0]!.witness.reason = "changed";
  expect(admitted).toEqual(result(source));
  expect(Object.isFrozen(admitted)).toBe(true);
  expect(Object.isFrozen(admitted.artifact)).toBe(true);
  expect(Object.isFrozen(admitted.claims)).toBe(true);
  expect(Object.isFrozen(admitted.claims[0]!.witness)).toBe(true);
});

test("malformed results and evidence for other artifacts are refused", async () => {
  const valid = result(source);
  const cases = [
    [null, "invalid-envelope"],
    [{ ...valid, claims: [] }, "invalid-envelope"],
    [result(source, artifact(document, "A")), "contract-mismatch"],
    [result(artifact(document, { title: "other" })), "boundary-mismatch"],
    [{ ...valid, artifact: artifact(rendered, "other") }, "boundary-mismatch"],
    [
      {
        ...valid,
        claims: [
          {
            ...valid.claims[0]!,
            to: [{ ...valid.claims[0]!.to[0]!, value: "forged" }],
          },
        ],
      },
      "identity-mismatch",
    ],
  ] as const;
  for (const [raw, code] of cases) {
    await expect(
      invoke({ operation, run: async () => raw }, source),
    ).rejects.toMatchObject({ code });
  }
});

test("passed, failed and unknown claims remain evidence without an acceptance decision", async () => {
  for (const verdict of ["passed", "failed", "unknown"] as const) {
    const expected = result(source, output, verdict);
    const admitted = await invoke(
      { operation, run: async () => expected },
      source,
    );
    expect(admitted).toEqual(expected);
    expect(admitted.claims[0]!.verdict).toBe(verdict);
  }
});

test("synchronous throws and asynchronous rejections propagate unchanged", async () => {
  const failure = new Error("Implementation could not produce a result");
  for (const run of [
    () => {
      throw failure;
    },
    () => Promise.reject(failure),
  ]) {
    await expect(invoke({ operation, run }, source)).rejects.toBe(failure);
  }
});

test("successive invocations exchange artifacts whose evidence composes", async () => {
  const first = await invoke(
    { operation, run: async (input) => result(input) },
    source,
  );
  const second = await invoke(
    {
      operation: { input: rendered, output: document },
      run: async (input) => result(input, source),
    },
    first.artifact,
  );
  const [trace] = compose([first, second]);
  expect(second.artifact).toEqual(source);
  expect(trace).toMatchObject({
    verdict: "passed",
    missingStage: null,
    firstIssueStage: null,
  });
  expect(trace!.claims).toEqual([...first.claims, ...second.claims]);
});
