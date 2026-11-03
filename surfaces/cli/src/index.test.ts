import { describe, expect, test } from "bun:test";
import type { Implementation } from "@gooi/exchange";
import { observe } from "@gooi/kernel/evidence";
import { cli } from "./index.js";

// A generic edge: the CLI must work without knowing any app.
const ECHO = { id: "urn:test:echo", version: 1 };
const echo: Implementation = {
  operation: { input: ECHO, output: ECHO },
  async run(input) {
    return {
      artifact: input,
      claims: [
        {
          contract: ECHO,
          scope: "Echoed the input",
          from: [observe(input, ECHO, "in", input.value)],
          to: [observe(input, ECHO, "out", input.value)],
          verdict: "passed",
          witness: null,
        },
      ],
    };
  },
};
const fail: Implementation = {
  operation: { input: ECHO, output: ECHO },
  async run() {
    throw new Error("Refused by the edge");
  },
};

async function run(argv: string[]) {
  const out: string[] = [],
    err: string[] = [];
  const code = await cli({ echo, fail }, argv, {
    name: "t",
    out: (text) => out.push(text),
    err: (text) => err.push(text),
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

describe("cli", () => {
  test("turns flags into the edge's input and prints its output", async () => {
    const result = await run(["echo", "--title", "A b", "--done=x=y"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out)).toEqual({ title: "A b", done: "x=y" });
  });

  test("passes an empty record when there are no flags", async () => {
    expect(JSON.parse((await run(["echo"])).out)).toEqual({});
  });

  test("lists commands for help, and fails without a command", async () => {
    const help = await run(["help"]);
    expect(help.code).toBe(0);
    expect(help.out).toContain("Commands: echo, fail");
    const none = await run([]);
    expect(none.code).toBe(1);
    expect(none.err).toContain("Usage: t <command>");
  });

  test("refuses unknown commands and malformed flags", async () => {
    for (const [argv, message] of [
      [["nope"], "Unknown command: nope"],
      [["toString"], "Unknown command: toString"],
      [["echo", "loose"], "Unexpected argument: loose"],
      [["echo", "--title"], "Missing value for --title"],
      [["echo", "--title", "--done", "x"], "Missing value for --title"],
      [["echo", "--a", "1", "--a", "2"], "Repeated flag: --a"],
      [["echo", "--__proto__", "x"], "Unexpected argument: --__proto__"],
    ] as const) {
      const result = await run([...argv]);
      expect(result.code).toBe(1);
      expect(result.err).toContain(message);
    }
  });

  test("reports an edge's refusal and exits nonzero", async () => {
    const result = await run(["fail"]);
    expect(result.code).toBe(1);
    expect(result.err).toBe("Refused by the edge");
  });
});
