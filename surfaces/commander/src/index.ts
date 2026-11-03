import { edge, invoke, type Implementation } from "@gooi/exchange";
import { artifact, artifactId } from "@gooi/kernel/evidence";
import type { Artifact, Digest, Value } from "@gooi/kernel/types";

/** This package's own dialect: commands, groups and options, nothing more. */
export const COMMAND_TREE = Object.freeze({ id: "urn:gooi:commander:command-tree", version: 1 });
export const COMMANDER_SOURCE = Object.freeze({ id: "urn:gooi:commander:source", version: 1 });
const LOWERED = Object.freeze({ id: "urn:gooi:commander:lowered", version: 1 });
const NAME = "^[a-z][a-z0-9]*$";

/** A named group of commands, as an engineer lays them out. */
export interface Group {
  readonly description: string;
  readonly commands: Layout;
}
/** Command names mapped to edges or groups. Nesting is the command tree. */
export type Layout = { readonly [name: string]: Implementation | Group };
export interface Program {
  readonly name: string;
  readonly description: string;
  /** Import specifier the generated file uses for the layout's module. */
  readonly module: string;
  /** The layout's export name in that module. */
  readonly export: string;
}
export interface Option {
  readonly field: string;
  readonly description: string;
  readonly required: boolean;
}
export type Node =
  | {
      readonly kind: "group";
      readonly name: string;
      readonly description: string;
      readonly commands: readonly Node[];
    }
  | {
      readonly kind: "command";
      readonly name: string;
      readonly description: string;
      /** Property path to the edge inside the layout export. */
      readonly path: readonly string[];
      readonly options: readonly Option[];
    };
export interface Tree extends Program {
  readonly commands: readonly Node[];
}

const name = { type: "string", pattern: NAME };
const text = { type: "string" };
const TREE_SCHEMA = {
  description: "A Commander program: groups, commands and their string options",
  type: "object",
  required: ["name", "description", "module", "export", "commands"],
  additionalProperties: false,
  properties: {
    name,
    description: text,
    module: { type: "string", minLength: 1 },
    export: { type: "string", pattern: "^[A-Za-z_$][A-Za-z0-9_$]*$" },
    commands: { type: "array", items: { $ref: "#/$defs/node" } },
  },
  $defs: {
    node: { oneOf: [{ $ref: "#/$defs/group" }, { $ref: "#/$defs/command" }] },
    group: {
      type: "object",
      required: ["kind", "name", "description", "commands"],
      additionalProperties: false,
      properties: {
        kind: { const: "group" },
        name,
        description: text,
        commands: { type: "array", items: { $ref: "#/$defs/node" } },
      },
    },
    command: {
      type: "object",
      required: ["kind", "name", "description", "path", "options"],
      additionalProperties: false,
      properties: {
        kind: { const: "command" },
        name,
        description: text,
        path: { type: "array", minItems: 1, items: name },
        options: {
          type: "array",
          items: {
            type: "object",
            required: ["field", "description", "required"],
            additionalProperties: false,
            properties: { field: name, description: text, required: { type: "boolean" } },
          },
        },
      },
    },
  },
};

function isEdge(node: unknown): node is Implementation {
  return (
    typeof node === "object" &&
    node !== null &&
    "operation" in node &&
    typeof (node as Implementation).run === "function"
  );
}
function checkName(value: string, where: string) {
  if (!new RegExp(NAME, "u").test(value) || value === "help")
    throw new Error(`${where}: names are lowercase letters and digits, not "help"; got "${value}"`);
}
function options(edge: Implementation, where: string): Option[] {
  const schema = edge.inputSchema as
    | { type?: string; properties?: Record<string, { type?: string; description?: string }>; required?: string[] }
    | undefined;
  if (!schema || schema.type !== "object")
    throw new Error(`${where}: Commander needs an object input schema to know its options`);
  return Object.entries(schema.properties ?? {}).map(([field, property]) => {
    checkName(field, `${where} --${field}`);
    if (property.type !== "string")
      throw new Error(`${where} --${field}: Commander options here are strings; got ${property.type}`);
    return {
      field,
      description: property.description ?? "",
      required: (schema.required ?? []).includes(field),
    };
  });
}
function nodes(layout: Layout, path: string[]): Node[] {
  return Object.entries(layout).map(([key, node]) => {
    const where = [...path.filter((p) => p !== "commands"), key].join(" ");
    checkName(key, where);
    if (isEdge(node)) {
      const description = (node.inputSchema as { description?: unknown } | undefined)?.description;
      return {
        kind: "command",
        name: key,
        description: typeof description === "string" ? description : "",
        path: [...path, key],
        options: options(node, where),
      };
    }
    if (node && typeof node.description === "string" && node.commands && typeof node.commands === "object")
      return {
        kind: "group",
        name: key,
        description: node.description,
        commands: nodes(node.commands, [...path, key, "commands"]),
      };
    throw new Error(`${where}: expected an edge or a {description, commands} group`);
  });
}

/** Read a layout of live edges into the command tree it describes. Runs no edge. */
export function describe(layout: Layout, program: Program): Tree {
  checkName(program.name, "program");
  return { ...program, commands: nodes(layout, []) };
}

const quote = (value: string) => JSON.stringify(value);
const camel = (path: readonly string[]) =>
  path.map((part, i) => (i ? part[0]!.toUpperCase() + part.slice(1) : part)).join("");

function lower(tree: Tree, from: Digest): string {
  const out = [
    "#!/usr/bin/env bun",
    `// Generated by @gooi/commander from command tree ${from}.`,
    `// Change the layout in ${tree.module} and regenerate, or take this file over:`,
    "// it calls the edges directly and doesn't need gooi's generic CLI.",
    'import { Command } from "commander";',
    'import { invoke, type Implementation } from "@gooi/exchange";',
    'import { artifact } from "@gooi/kernel/evidence";',
    `import { ${tree.export} } from ${quote(tree.module)};`,
    "",
    "async function run(edge: Implementation, options: Record<string, string | undefined>) {",
    "  const input = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));",
    "  try {",
    "    const result = await invoke(edge, artifact(edge.operation.input, input));",
    "    console.log(JSON.stringify(result.artifact.value, null, 2));",
    "  } catch (error) {",
    "    console.error(error instanceof Error ? error.message : String(error));",
    "    process.exitCode = 1;",
    "  }",
    "}",
    "",
    `const program = new Command(${quote(tree.name)}).description(${quote(tree.description)});`,
  ];
  function emit(list: readonly Node[], parent: string, names: string[]) {
    const seen = new Set<string>();
    for (const node of list) {
      if (seen.has(node.name)) throw new Error(`Two commands named "${node.name}" under ${parent}`);
      seen.add(node.name);
      out.push("");
      if (node.kind === "group") {
        const variable = `${camel([...names, node.name])}Commands`;
        out.push(
          `const ${variable} = ${parent}.command(${quote(node.name)}).description(${quote(node.description)});`,
        );
        emit(node.commands, variable, [...names, node.name]);
        continue;
      }
      const target = `${tree.export}.${node.path.join(".")}`;
      const values = node.options.map((o) => `${o.field}: options.${o.field}`).join(", ");
      out.push(
        parent,
        `  .command(${quote(node.name)})`,
        `  .description(${quote(node.description)})`,
        ...node.options.map(
          (o) =>
            `  .${o.required ? "requiredOption" : "option"}(${quote(`--${o.field} <${o.field}>`)}, ${quote(o.description)})`,
        ),
        node.options.length
          ? `  .action((options) => run(${target}, { ${values} }));`
          : `  .action(() => run(${target}, {}));`,
      );
    }
  }
  emit(tree.commands, "program", []);
  out.push("", "await program.parseAsync();", "");
  return out.join("\n");
}

/** One lowering edge: command tree to the source of a Commander program. */
export const toCommander: Implementation = edge(
  {
    operation: { input: COMMAND_TREE, output: COMMANDER_SOURCE },
    inputSchema: TREE_SCHEMA as Value,
    claim: LOWERED,
    scope:
      "Lowered this exact command tree to Commander source that imports the tree's module; excludes whether that module still exports matching edges",
  },
  (input) => lower(input.value as unknown as Tree, artifactId(input)),
);

/** Describe a layout and lower it: the tree artifact, the generated source, and the evidence. */
export async function compile(layout: Layout, program: Program) {
  const tree: Artifact = artifact(COMMAND_TREE, describe(layout, program));
  const result = await invoke(toCommander, tree);
  return { tree, source: result.artifact.value as string, result };
}
