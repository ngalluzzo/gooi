import { describe as group, expect, test } from "bun:test";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { ESTREE_PROGRAM, printTypeScript } from "./index.js";

group("printTypeScript", () => {
  const program = (...body: object[]) =>
    artifact(ESTREE_PROGRAM, { type: "Program", sourceType: "module", body });
  const say = (expression: object, extra: object = {}) => ({
    type: "ExpressionStatement",
    expression,
    ...extra,
  });
  const x = { type: "Identifier", name: "x" };

  test("prints a program that parses back", async () => {
    const log = {
      type: "CallExpression",
      callee: { type: "Identifier", name: "log" },
      arguments: [{ type: "Literal", value: "it's \"fine\"\n" }],
      optional: false,
    };
    const result = await invoke(printTypeScript, program(say(log)));
    expect(result.artifact.value).toBe('log("it\'s \\"fine\\"\\n");\n');
  });

  test("a lone string statement is a directive, so it doesn't print back", async () => {
    // Parsers read a leading string statement as a directive like "use strict".
    const directive = say({ type: "Literal", value: "use strict" });
    await expect(invoke(printTypeScript, program(directive))).rejects.toThrow(
      "doesn't parse back",
    );
  });

  test("refuses any program whose text would mean something else", async () => {
    for (const statement of [
      say({ type: "Literal", value: "x", raw: "globalThis.evil()" }),
      say({ type: "BinaryExpression", operator: "+ evil() +", left: x, right: x }),
      say({ type: "Identifier", name: "x; evil()" }),
      say(x, { leadingComments: [{ type: "Line", value: " ok\nevil()" }] }),
    ])
      await expect(invoke(printTypeScript, program(statement))).rejects.toThrow(
        "doesn't parse back to the same program",
      );
  });
});
