import { print } from "esrap";
import ts from "esrap/languages/ts";
import { parseSync } from "oxc-parser";
import { edge, type Implementation } from "@gooi/exchange";
import { canonical } from "@gooi/kernel/value";
import type { Value } from "@gooi/kernel/types";

/** An ESTree Program, with typescript-estree nodes for types. An existing
 * standard: gooi names it here and defines none of it. */
export const ESTREE_PROGRAM = Object.freeze({
  id: "https://github.com/estree/estree",
  version: 1,
});
export const TYPESCRIPT_SOURCE = Object.freeze({
  id: "urn:gooi:estree:typescript-source",
  version: 1,
});
const PRINTED = Object.freeze({ id: "urn:gooi:estree:printed", version: 1 });

export type Node = { readonly type: string; readonly [key: string]: Value };

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
const RESERVED = new Set(
  "arguments await break case catch class const continue debugger default delete do else enum eval export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield".split(
    " ",
  ),
);
const LINE_BREAK = /[\n\r\u2028\u2029]/u;

/** A name in expression or property position. */
export function id(name: string): Node {
  if (!IDENTIFIER.test(name))
    throw new Error(`Not a JavaScript identifier: ${JSON.stringify(name)}`);
  return { type: "Identifier", name };
}
/** A name that declares a binding, so reserved words are refused too. */
export function binding(name: string): Node {
  if (RESERVED.has(name))
    throw new Error(`A reserved word can't name a binding: ${name}`);
  return id(name);
}
export const literal = (value: string | number | null): Node => ({
  type: "Literal",
  value,
});
/** A `//` comment; refuses text that would end the comment early. */
export function lineComment(value: string): Value {
  if (LINE_BREAK.test(value)) throw new Error("A line comment can't break lines");
  return { type: "Line", value };
}
export const member = (object: Node, ...names: string[]): Node =>
  names.reduce<Node>(
    (target, name) => ({
      type: "MemberExpression",
      object: target,
      property: id(name),
      computed: false,
      optional: false,
    }),
    object,
  );
export const call = (callee: Node, ...args: Node[]): Node => ({
  type: "CallExpression",
  callee,
  arguments: args,
  optional: false,
});
/** `target.a(...).b(...)`: each step is a method name and its arguments. */
export const chain = (target: Node, steps: readonly [string, ...Node[]][]) =>
  steps.reduce((on, [name, ...args]) => call(member(on, name), ...args), target);
export const statement = (expression: Node): Node => ({
  type: "ExpressionStatement",
  expression,
});
export const block = (body: Node[]): Node => ({ type: "BlockStatement", body });
export const constant = (name: string, init: Node): Node => ({
  type: "VariableDeclaration",
  kind: "const",
  declarations: [{ type: "VariableDeclarator", id: binding(name), init }],
});
export const arrow = (params: string[], body: Node): Node => ({
  type: "ArrowFunctionExpression",
  params: params.map(binding),
  body,
  expression: true,
  async: false,
});
export function importFrom(source: string, values: string[], types: string[] = []): Node {
  const specifier = (name: string, importKind: string) => {
    const local = binding(name);
    return { type: "ImportSpecifier", imported: local, local, importKind };
  };
  return {
    type: "ImportDeclaration",
    specifiers: [
      ...values.map((name) => specifier(name, "value")),
      ...types.map((name) => specifier(name, "type")),
    ],
    source: literal(source),
    importKind: "value",
  };
}

const POSITION = new Set(["start", "end", "range", "loc", "raw"]);
/** Drop positions, raw spellings, comments and empty defaults, keeping meaning. */
function normalize(node: unknown): unknown {
  return JSON.parse(
    JSON.stringify(node, (key, value) => {
      if (POSITION.has(key) || key === "leadingComments" || key === "trailingComments")
        return undefined;
      if (key !== "value" && (value === null || value === false))
        return undefined;
      if (Array.isArray(value) && !value.length && key !== "body" && key !== "arguments")
        return undefined;
      return value;
    }),
  );
}
function comments(node: unknown, found: { type: string; value: string }[] = []) {
  if (Array.isArray(node)) for (const item of node) comments(item, found);
  else if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    for (const c of (record.leadingComments as { type: string; value: string }[]) ?? [])
      found.push({ type: c.type, value: c.value });
    for (const [key, value] of Object.entries(record))
      if (key !== "leadingComments") comments(value, found);
  }
  return found;
}

/** Whether TypeScript source parses to exactly this program's statements,
 * ignoring positions, formatting and comments. */
export function parsesTo(source: string, program: Node): boolean {
  const parsed = parseSync("module.ts", source, { sourceType: "module" });
  return (
    !parsed.errors.length &&
    canonical(normalize(parsed.program.body)) === canonical(normalize(program.body))
  );
}

/** One printing edge: an ESTree program to TypeScript text, refused unless the
 * text parses back to the same program and the same comments. */
export const printTypeScript: Implementation = edge(
  {
    operation: { input: ESTREE_PROGRAM, output: TYPESCRIPT_SOURCE },
    inputSchema: {
      type: "object",
      required: ["type", "body"],
      properties: { type: { const: "Program" }, body: { type: "array" } },
    },
    claim: PRINTED,
    scope:
      "Printed this ESTree program as TypeScript, then parsed the text back to the same statements and comments, ignoring positions and formatting; excludes what the program does",
  },
  (input) => {
    const program = input.value as unknown as Node;
    const { code } = print(
      program as never,
      ts({
        quotes: "double",
        getLeadingComments: (node) =>
          (node as { leadingComments?: never }).leadingComments,
      }),
      { indent: "  " },
    );
    const source = code.endsWith("\n") ? code : `${code}\n`;
    const parsed = parseSync("module.ts", source, { sourceType: "module" });
    const back = parsed.comments.map((c) => ({ type: c.type, value: c.value }));
    if (!parsesTo(source, program) || canonical(back) !== canonical(comments(program)))
      throw new Error("The printed source doesn't parse back to the same program");
    return source;
  },
);
