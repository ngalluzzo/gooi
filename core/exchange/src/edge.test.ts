import { describe, expect, test } from "bun:test";
import { compose } from "@gooi/kernel/compose";
import { artifact, artifactId } from "@gooi/kernel/evidence";
import { edge, invoke, path } from "./invoke.js";

const IN = { id: "urn:test:in", version: 1 };
const OUT = { id: "urn:test:out", version: 1 };
const CLAIM = { id: "urn:test:applied", version: 1 };

describe("edge", () => {
  test("two edges chain, and compose connects their claims", async () => {
    const inc = (from: typeof IN, to: typeof IN) =>
      edge(
        { operation: { input: from, output: to }, claim: CLAIM, scope: "Added one" },
        (input) => ({ n: (input.value as { n: number }).n + 1 }),
      );
    const first = await invoke(inc(IN, OUT), artifact(IN, { n: 1 }));
    const second = await invoke(inc(OUT, IN), first.artifact);
    const [trace] = compose([first, second]);
    expect(trace).toMatchObject({ verdict: "passed", firstIssueStage: null, missingStage: null });
    expect(trace!.claims).toHaveLength(2);
  });

  test("returns one passed claim pinned to the exact input and output", async () => {
    const double = edge(
      {
        operation: { input: IN, output: OUT },
        claim: CLAIM,
        scope: "Doubled n",
      },
      async (input) => ({ n: (input.value as { n: number }).n * 2 }),
    );
    const input = artifact(IN, { n: 2 });
    const result = await invoke(double, input);
    expect(result.artifact).toEqual(artifact(OUT, { n: 4 }));
    expect(result.claims).toHaveLength(1);
    const [claim] = result.claims;
    expect(claim!.verdict).toBe("passed");
    expect(claim!.from[0]!.artifact).toBe(artifactId(input));
    expect(claim!.to[0]!.artifact).toBe(artifactId(result.artifact));
  });

  test("invoke checks a declared input schema before apply runs", async () => {
    let ran = 0;
    const greet = edge(
      {
        operation: { input: IN, output: OUT },
        inputSchema: {
          type: "object",
          properties: { name: { type: "string", maxLength: 5 } },
          required: ["name"],
          additionalProperties: false,
        },
        claim: CLAIM,
        scope: "Greeted",
      },
      (input) => {
        ran++;
        return { text: `hi ${(input.value as { name: string }).name}` };
      },
    );
    expect(greet.inputSchema).toMatchObject({ required: ["name"] });
    for (const [value, problem] of [
      [{}, "Missing field: name"],
      [{ name: "a", extra: "b" }, "Unexpected field: extra"],
      [{ name: 7 }, "name must be string"],
      [{ name: "toolong" }, "name must NOT have more than 5 characters"],
    ] as const)
      await expect(invoke(greet, artifact(IN, value))).rejects.toThrow(
        expect.objectContaining({ name: "InputError", message: problem }),
      );
    expect(ran).toBe(0);
    expect(
      (await invoke(greet, artifact(IN, { name: "ana" }))).artifact.value,
    ).toEqual({
      text: "hi ana",
    });
  });

  test("accepts schemas from other standards as JSON Schema 2020-12 specifies", async () => {
    // Unknown keywords are ignored and formats are annotations, so a published
    // schema with its own extensions (like ACP's x-side) can be used as is.
    const adopted = edge(
      {
        operation: { input: IN, output: OUT },
        inputSchema: {
          $defs: { id: { type: "integer", format: "uint64", "x-side": "agent" } },
          type: "object",
          properties: { n: { $ref: "#/$defs/id" } },
          required: ["n"],
        },
        claim: CLAIM,
        scope: "Adopted",
      },
      (input) => input.value,
    );
    expect((await invoke(adopted, artifact(IN, { n: 3 }))).artifact.value).toEqual({ n: 3 });
    await expect(invoke(adopted, artifact(IN, { n: "3" }))).rejects.toThrow("n must be integer");
  });

  test("propagates errors from apply", async () => {
    const refuse = edge(
      { operation: { input: IN, output: OUT }, claim: CLAIM, scope: "Refuses" },
      () => {
        throw new Error("no");
      },
    );
    await expect(invoke(refuse, artifact(IN, {}))).rejects.toThrow("no");
  });
});

describe("path", () => {
  const MID = { id: "urn:test:mid", version: 1 };
  const step = (from: typeof IN, to: typeof IN, inputSchema?: object) =>
    edge(
      {
        operation: { input: from, output: to },
        ...(inputSchema ? { inputSchema: inputSchema as never } : {}),
        claim: CLAIM,
        scope: "Step",
      },
      (input) => ({ n: (input.value as { n: number }).n + 1 }),
    );
  const schema = { type: "object", properties: { n: { type: "integer" } }, required: ["n"] };

  test("runs connected edges as one, carrying their composed trace", async () => {
    const both = path(step(IN, MID, schema), step(MID, OUT));
    expect(both.operation).toEqual({ input: IN, output: OUT });
    expect(both.inputSchema).toEqual(schema);
    const input = artifact(IN, { n: 1 });
    const result = await invoke(both, input);
    expect(result.artifact).toEqual(artifact(OUT, { n: 3 }));
    const [claim] = result.claims;
    expect(claim!.verdict).toBe("passed");
    expect(claim!.from[0]!.artifact).toBe(artifactId(input));
    const [trace] = claim!.witness as unknown as { verdict: string; claims: unknown[] }[];
    expect(trace).toMatchObject({ verdict: "passed" });
    expect(trace!.claims).toHaveLength(2);
    await expect(invoke(both, artifact(IN, { n: "x" }))).rejects.toThrow("n must be integer");
  });

  test("refuses steps that don't connect", () => {
    expect(() => path()).toThrow("at least one edge");
    expect(() => path(step(IN, MID), step(IN, OUT))).toThrow(
      "Step 2 takes urn:test:in@1 but step 1 gives urn:test:mid@1",
    );
  });
});
