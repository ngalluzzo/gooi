import { edge, invoke, type Implementation } from "@gooi/exchange";
import { compose } from "@gooi/kernel/compose";
import { artifact, artifactId } from "@gooi/kernel/evidence";
import type { Artifact, Digest, Value } from "@gooi/kernel/types";
import {
  ESTREE_PROGRAM,
  arrow,
  binding,
  block,
  call,
  chain,
  constant,
  id,
  importFrom,
  lineComment,
  literal,
  member,
  printTypeScript,
  statement,
  type Node as Estree,
} from "./estree.js";

export { ESTREE_PROGRAM, TYPESCRIPT_SOURCE, parsesTo, printTypeScript } from "./estree.js";

/** This package's own dialect: commands, groups and options, nothing more. */
export const COMMAND_TREE = Object.freeze({ id: "urn:gooi:commander:command-tree", version: 1 });
const LOWERED = Object.freeze({ id: "urn:gooi:commander:lowered", version: 1 });
const NAME = "^[a-z][a-z0-9]*$";
const ONE_LINE = "^[^\\u0000-\\u001f\\u007f\\u2028\\u2029]*$";

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
const text = { type: "string", pattern: ONE_LINE };
const TREE_SCHEMA = {
  description: "A Commander program: groups, commands and their string options",
  type: "object",
  required: ["name", "description", "module", "export", "commands"],
  additionalProperties: false,
  properties: {
    name,
    description: text,
    module: { type: "string", minLength: 1, pattern: ONE_LINE },
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

const camel = (path: readonly string[]) =>
  path.map((part, i) => (i ? part[0]!.toUpperCase() + part.slice(1) : part)).join("");
const typed = (name: string, type: Value): Estree => ({
  ...binding(name),
  typeAnnotation: { type: "TSTypeAnnotation", typeAnnotation: type },
});

// async function run(edge: Implementation, input: unknown) { try { ... } catch (error) { ... } }
const RUN: Estree = {
  type: "FunctionDeclaration",
  id: binding("run"),
  async: true,
  generator: false,
  params: [
    typed("edge", { type: "TSTypeReference", typeName: id("Implementation") }),
    typed("input", { type: "TSUnknownKeyword" }),
  ],
  body: block([
    {
      type: "TryStatement",
      block: block([
        constant("result", {
          type: "AwaitExpression",
          argument: call(
            id("invoke"),
            id("edge"),
            call(id("artifact"), member(id("edge"), "operation", "input"), id("input")),
          ),
        }),
        statement(
          call(
            member(id("console"), "log"),
            call(
              member(id("JSON"), "stringify"),
              member(id("result"), "artifact", "value"),
              literal(null),
              literal(2),
            ),
          ),
        ),
      ]),
      handler: {
        type: "CatchClause",
        param: binding("error"),
        body: block([
          statement(
            call(member(id("console"), "error"), {
              type: "ConditionalExpression",
              test: {
                type: "BinaryExpression",
                operator: "instanceof",
                left: id("error"),
                right: id("Error"),
              },
              consequent: member(id("error"), "message"),
              alternate: call(id("String"), id("error")),
            }),
          ),
          statement({
            type: "AssignmentExpression",
            operator: "=",
            left: member(id("process"), "exitCode"),
            right: literal(1),
          }),
        ]),
      },
    },
  ]),
};

/** Build the ESTree program. Every name is checked as it becomes a node, and
 * tree text only ever appears as string literals. */
function lower(tree: Tree, from: Digest): Estree {
  const body: Estree[] = [
    {
      ...importFrom("commander", ["Command"]),
      leadingComments: [
        lineComment(` Generated by @gooi/commander from command tree ${from}.`),
        lineComment(" Change the layout and regenerate, or take this file over: it calls the"),
        lineComment(" edges directly and doesn't need gooi's generic CLI."),
      ],
    },
    importFrom("@gooi/exchange", ["invoke"], ["Implementation"]),
    importFrom("@gooi/kernel/evidence", ["artifact"]),
    importFrom(tree.module, [tree.export]),
    RUN,
    constant(
      "program",
      chain({ type: "NewExpression", callee: id("Command"), arguments: [literal(tree.name)] }, [
        ["description", literal(tree.description)],
      ]),
    ),
  ];
  function emit(list: readonly Node[], parent: string, names: string[]) {
    const seen = new Set<string>();
    for (const node of list) {
      if (seen.has(node.name)) throw new Error(`Two commands named "${node.name}" under ${parent}`);
      seen.add(node.name);
      const named: [string, ...Estree[]][] = [
        ["command", literal(node.name)],
        ["description", literal(node.description)],
      ];
      if (node.kind === "group") {
        const variable = `${camel([...names, node.name])}Commands`;
        body.push(constant(variable, chain(id(parent), named)));
        emit(node.commands, variable, [...names, node.name]);
        continue;
      }
      const spread = { type: "ObjectExpression", properties: [{ type: "SpreadElement", argument: id("options") }] };
      body.push(
        statement(
          chain(id(parent), [
            ...named,
            ...node.options.map((o): [string, ...Estree[]] => [
              o.required ? "requiredOption" : "option",
              literal(`--${o.field} <${o.field}>`),
              literal(o.description),
            ]),
            ["action", arrow(["options"], call(id("run"), member(id(tree.export), ...node.path), spread))],
          ]),
        ),
      );
    }
  }
  emit(tree.commands, "program", []);
  body.push(statement({ type: "AwaitExpression", argument: call(member(id("program"), "parseAsync")) }));
  return { type: "Program", sourceType: "module", body };
}

/** The lowering edge: a command tree to the ESTree program of a Commander CLI. */
export const lowerToEstree: Implementation = edge(
  {
    operation: { input: COMMAND_TREE, output: ESTREE_PROGRAM },
    inputSchema: TREE_SCHEMA as Value,
    claim: LOWERED,
    scope:
      "Lowered this exact command tree to an ESTree program that imports only commander, @gooi/exchange, @gooi/kernel/evidence and the tree's module, with every name checked; excludes whether that module still exports matching edges",
  },
  (input) => lower(input.value as unknown as Tree, artifactId(input)),
);

/** Describe a layout, lower it to ESTree, and print it: every artifact, the
 * source, and the composed evidence across both hops. */
export async function compile(layout: Layout, program: Program) {
  const tree: Artifact = artifact(COMMAND_TREE, describe(layout, program));
  const lowered = await invoke(lowerToEstree, tree);
  const printed = await invoke(printTypeScript, lowered.artifact);
  return {
    tree,
    program: lowered.artifact,
    source: printed.artifact.value as string,
    traces: compose([lowered, printed]),
  };
}
