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
