import { print } from "esrap";
import ts from "esrap/languages/ts";
import tsx from "esrap/languages/tsx";
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
export const TSX_SOURCE = Object.freeze({ id: "urn:gooi:estree:tsx-source", version: 1 });
const PRINTED = Object.freeze({ id: "urn:gooi:estree:printed", version: 1 });

export type Node = { readonly type: string; readonly [key: string]: Value };

const COMPONENT = /^[A-Z][A-Za-z0-9]*$/u;
const INTRINSIC = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const ATTRIBUTE = /^[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*$/u;
/** Text JSX can hold as a plain "..." attribute: no quotes, escapes or entities. */
const PLAIN_ATTRIBUTE = /^[^"\\&\n\r]*$/u;
const jsxName = (name: string): Node => {
  if (!COMPONENT.test(name) && !INTRINSIC.test(name))
    throw new Error(`Not a JSX element name: ${JSON.stringify(name)}`);
  return { type: "JSXIdentifier", name };
};
/** `{expression}` inside JSX. */
export const embed = (expression: Node): Node => ({ type: "JSXExpressionContainer", expression });
/** `{...argument}` among JSX attributes. */
export const spreadAttribute = (argument: Node): Node => ({ type: "JSXSpreadAttribute", argument });
/** A JSX attribute. Strings that a plain attribute can't hold become `{"..."}`. */
export function attribute(name: string, value: string | Node): Node {
  if (!ATTRIBUTE.test(name)) throw new Error(`Not a JSX attribute name: ${JSON.stringify(name)}`);
  return {
    type: "JSXAttribute",
    name: { type: "JSXIdentifier", name },
    value:
      typeof value !== "string"
        ? embed(value)
        : PLAIN_ATTRIBUTE.test(value)
          ? literal(value)
          : embed(literal(value)),
  };
}
/** `<Name ...>children</Name>`, or self-closing without children. Text
 * belongs in `embed(literal(...))`, never raw JSX text. */
export function jsx(name: string, attributes: Node[], children: Node[] = []): Node {
  const element = jsxName(name);
  return {
    type: "JSXElement",
    openingElement: {
      type: "JSXOpeningElement",
      name: element,
      attributes,
      selfClosing: !children.length,
    },
    children,
    closingElement: children.length ? { type: "JSXClosingElement", name: element } : null,
  };
}

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
/** `const name = init` or `let name = init`. */
export const declare = (kind: "const" | "let", name: string, init: Node | null): Node => ({
  type: "VariableDeclaration",
  kind,
  declarations: [{ type: "VariableDeclarator", id: binding(name), init }],
});
export const constant = (name: string, init: Node): Node => declare("const", name, init);
/** `target[index]` for a fixed array position. */
export const element = (target: Node, index: number): Node => ({
  type: "MemberExpression",
  object: target,
  property: literal(index),
  computed: true,
  optional: false,
});
export const construct = (callee: Node, ...args: Node[]): Node => ({
  type: "NewExpression",
  callee,
  arguments: args,
});
/** An object literal; keys that aren't identifiers become string keys. */
export const object = (entries: readonly [string, Node][]): Node => ({
  type: "ObjectExpression",
  properties: entries.map(([key, value]) => ({
    type: "Property",
    key: IDENTIFIER.test(key) ? id(key) : literal(key),
    value,
    kind: "init",
    computed: false,
    method: false,
    shorthand: false,
  })),
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

type Language = "ts" | "tsx";
const parse = (source: string, language: Language) =>
  parseSync(`module.${language}`, source, { sourceType: "module", preserveParens: false });

/** Parse trusted, constant source into ESTree statements so a lowering can
 * splice fixed code around the parts it builds. Never pass text that came
 * from data: data becomes nodes only through the builders above. */
export function parseProgram(source: string, language: Language = "ts"): Node[] {
  const parsed = parse(source, language);
  if (parsed.errors.length) throw new Error(`Constant source doesn't parse: ${parsed.errors[0]!.message}`);
  return JSON.parse(
    JSON.stringify(parsed.program.body, (key, value) =>
      key === "start" || key === "end" ? undefined : value,
    ),
  );
}

/** Whether TypeScript (or TSX) source parses to exactly this program's
 * statements, ignoring positions, formatting and comments. */
export function parsesTo(source: string, program: Node, language: Language = "ts"): boolean {
  const parsed = parse(source, language);
  return (
    !parsed.errors.length &&
    canonical(normalize(parsed.program.body)) === canonical(normalize(program.body))
  );
}

function printer(language: Language, output: Value): Implementation {
  const name = language === "ts" ? "TypeScript" : "TSX";
  return edge(
    {
      operation: { input: ESTREE_PROGRAM, output: output as never },
      inputSchema: {
        type: "object",
        required: ["type", "body"],
        properties: { type: { const: "Program" }, body: { type: "array" } },
      },
      claim: PRINTED,
      scope: `Printed this ESTree program as ${name}, then parsed the text back to the same statements and comments, ignoring positions and formatting; excludes what the program does`,
    },
    (input) => {
      const program = input.value as unknown as Node;
      const options = {
        quotes: "double" as const,
        getLeadingComments: (node: unknown) =>
          (node as { leadingComments?: never }).leadingComments,
      };
      const visitors = language === "ts" ? ts(options) : tsx(options);
      const { code } = print(program as never, visitors, { indent: "  " });
      const source = code.endsWith("\n") ? code : `${code}\n`;
      const back = parse(source, language).comments.map((c) => ({ type: c.type, value: c.value }));
      if (!parsesTo(source, program, language) || canonical(back) !== canonical(comments(program)))
        throw new Error("The printed source doesn't parse back to the same program");
      return source;
    },
  );
}

/** One printing edge: an ESTree program to TypeScript text, refused unless the
 * text parses back to the same program and the same comments. */
export const printTypeScript: Implementation = printer("ts", TYPESCRIPT_SOURCE);
/** The same for programs with JSX: ESTree to TSX text, parsed back as TSX. */
export const printTsx: Implementation = printer("tsx", TSX_SOURCE);
