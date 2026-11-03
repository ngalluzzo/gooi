import { describe, expect, test } from "bun:test";
import { artifact, artifactId } from "@gooi/kernel/evidence";
import { edge, invoke } from "./invoke.js";

const IN = { id: "urn:test:in", version: 1 };
const OUT = { id: "urn:test:out", version: 1 };
const CLAIM = { id: "urn:test:applied", version: 1 };

describe("edge", () => {
  test("returns one passed claim pinned to the exact input and output", async () => {
    const double = edge(
      { operation: { input: IN, output: OUT }, claim: CLAIM, scope: "Doubled n" },
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
    expect((await invoke(greet, artifact(IN, { name: "ana" }))).artifact.value).toEqual({
      text: "hi ana",
    });
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
