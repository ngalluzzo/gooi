import { describe as group, expect, test } from "bun:test";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import {
  ESTREE_PROGRAM,
  attribute,
  constant,
  embed,
  jsx,
  literal,
  parsesTo,
  printTsx,
  printTypeScript,
} from "./index.js";

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

group("printTsx", () => {
  const program = (...body: object[]) =>
    artifact(ESTREE_PROGRAM, { type: "Program", sourceType: "module", body });

  test("prints JSX, keeping awkward attribute text in expressions", async () => {
    const element = jsx("Card", [attribute("className", "gap-0"), attribute("title", 'a "b" & c')], [
      embed(literal("<b>text</b>")),
    ]);
    const source = (await invoke(printTsx, program(constant("view", element)))).artifact.value as string;
    expect(source).toBe(
      'const view = <Card className="gap-0" title={"a \\"b\\" & c"}>{"<b>text</b>"}</Card>;\n',
    );
    expect(parsesTo(source, { type: "Program", body: [constant("view", element)] } as never, "tsx")).toBe(true);
  });

  test("refuses JSX whose text would mean something else", async () => {
    const raw = {
      type: "JSXElement",
      openingElement: {
        type: "JSXOpeningElement",
        name: { type: "JSXIdentifier", name: "a" },
        attributes: [
          {
            type: "JSXAttribute",
            name: { type: "JSXIdentifier", name: "title" },
            value: { type: "Literal", value: 'x" onClick={evil} y="' },
          },
        ],
        selfClosing: true,
      },
      children: [],
      closingElement: null,
    };
    await expect(invoke(printTsx, program(constant("view", raw as never)))).rejects.toThrow(
      "doesn't parse back to the same program",
    );
    expect(() => jsx("img onerror", [])).toThrow("Not a JSX element name");
    expect(() => attribute('x"', "y")).toThrow("Not a JSX attribute name");
  });
});
