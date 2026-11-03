import { describe as group, expect, test } from "bun:test";
import { edge, invoke } from "@gooi/exchange";
import { artifact, artifactId } from "@gooi/kernel/evidence";
import { COMMAND_TREE, compile, describe, toCommander, type Layout } from "./index.js";

const IN = { id: "urn:test:in", version: 1 };
const OUT = { id: "urn:test:out", version: 1 };
const fake = (inputSchema?: object) =>
  edge(
    {
      operation: { input: IN, output: OUT },
      ...(inputSchema ? { inputSchema: inputSchema as never } : {}),
      claim: { id: "urn:test:applied", version: 1 },
      scope: "Test",
    },
    () => ({}),
  );
const add = fake({
  description: "Add a thing",
  type: "object",
  properties: {
    title: { type: "string", description: "Its title" },
    notes: { type: "string", description: "Extra notes" },
  },
  required: ["title"],
  additionalProperties: false,
});
const list = fake({ description: "List things", type: "object", properties: {} });
const layout: Layout = {
  thing: { description: "Things", commands: { add, list } },
  status: list,
};
const program = { name: "app", description: "An app", module: "./layout.js", export: "layout" };

group("describe", () => {
  test("turns a layout of edges into a command tree", () => {
    expect(describe(layout, program)).toEqual({
      ...program,
      commands: [
        {
          kind: "group",
          name: "thing",
          description: "Things",
          commands: [
            {
              kind: "command",
              name: "add",
              description: "Add a thing",
              path: ["thing", "commands", "add"],
              options: [
                { field: "title", description: "Its title", required: true },
                { field: "notes", description: "Extra notes", required: false },
              ],
            },
            {
              kind: "command",
              name: "list",
              description: "List things",
              path: ["thing", "commands", "list"],
              options: [],
            },
          ],
        },
        { kind: "command", name: "status", description: "List things", path: ["status"], options: [] },
      ],
    });
  });

  test("refuses what Commander cannot express", () => {
    expect(() => describe({ x: fake() }, program)).toThrow("x: Commander needs an object input schema");
    const numeric = fake({ type: "object", properties: { n: { type: "number" } } });
    expect(() => describe({ x: numeric }, program)).toThrow("x --n: Commander options here are strings");
    expect(() => describe({ "Bad-Name": list }, program)).toThrow("names are lowercase");
    expect(() => describe({ help: list }, program)).toThrow('not "help"');
    expect(() => describe({ x: { nope: true } } as never, program)).toThrow("expected an edge or a");
  });
});

group("toCommander", () => {
  test("emits a Commander program that calls the edges directly", async () => {
    const { tree, source, result } = await compile(layout, program);
    expect(source).toStartWith("#!/usr/bin/env bun\n");
    expect(source).toContain(`from command tree ${artifactId(tree)}.`);
    expect(source).toContain('import { layout } from "./layout.js";');
    expect(source).not.toContain("@gooi/cli");
    expect(source).toContain(
      'const thingCommands = program.command("thing").description("Things");',
    );
    expect(source).toContain(
      [
        "thingCommands",
        '  .command("add")',
        '  .description("Add a thing")',
        '  .requiredOption("--title <title>", "Its title")',
        '  .option("--notes <notes>", "Extra notes")',
        "  .action((options) => run(layout.thing.commands.add, { title: options.title, notes: options.notes }));",
      ].join("\n"),
    );
    expect(source).toContain("  .action(() => run(layout.status, {}));");
    expect(source).toEndWith("await program.parseAsync();\n");
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0]!.from[0]!.artifact).toBe(artifactId(tree));
  });

  test("checks a hand-written tree against the dialect's schema", async () => {
    const bad = artifact(COMMAND_TREE, { ...program, commands: [{ kind: "command", name: "x" }] });
    await expect(invoke(toCommander, bad)).rejects.toThrow();
    const twice = artifact(COMMAND_TREE, {
      ...program,
      commands: [
        { kind: "command", name: "x", description: "", path: ["x"], options: [] },
        { kind: "command", name: "x", description: "", path: ["y"], options: [] },
      ],
    });
    await expect(invoke(toCommander, twice)).rejects.toThrow('Two commands named "x"');
  });
});
