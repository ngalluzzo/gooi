import { edge, invoke, type Implementation } from "@gooi/exchange";
import { compose } from "@gooi/kernel/compose";
import { artifact, artifactId } from "@gooi/kernel/evidence";
import type { Artifact, Contract, Digest, Value } from "@gooi/kernel/types";
import {
  binding,
  block,
  call,
  constant,
  construct,
  declare,
  element,
  ESTREE_PROGRAM,
  id,
  importFrom,
  lineComment,
  literal,
  member,
  object,
  printTypeScript,
  statement,
  type Node as Estree,
} from "@gooi/estree";

/** This package's own dialect: GET routes and what they serve, nothing more. */
export const ROUTE_TREE = Object.freeze({ id: "urn:gooi:hono:route-tree", version: 1 });
const LOWERED = Object.freeze({ id: "urn:gooi:hono:lowered", version: 1 });
const NAME = "^[a-z][a-z0-9]*$";
const PATH = "^/(?:[a-z0-9-]+(?:/[a-z0-9-]+)*)?$";
const MEDIA = "^[a-z]+/[a-z0-9.+-]+$";
const ONE_LINE = "^[^\\u0000-\\u001f\\u007f\\u2028\\u2029]*$";
/** Output contracts named by an IANA media type registration are served as that type. */
const MEDIA_TYPES = "https://www.iana.org/assignments/media-types/";

export interface Route {
  readonly path: string;
  /** Edges run in order: the first gets the query string, each next gets the previous output. */
  readonly steps: Implementation[];
}
export type Routes = { readonly [name: string]: Route };
export interface Server {
  /** Import specifier the generated file uses for the routes' module. */
  readonly module: string;
  /** The routes' export name in that module. */
  readonly export: string;
}
export interface RouteNode {
  readonly name: string;
  readonly path: string;
  /** The media type served, or null for JSON. */
  readonly media: string | null;
}
export interface RouteTree extends Server {
  readonly routes: readonly RouteNode[];
}

const ROUTE_TREE_SCHEMA = {
  description: "A Hono app: GET routes, each running a path of edges",
  type: "object",
  required: ["module", "export", "routes"],
  additionalProperties: false,
  properties: {
    module: { type: "string", minLength: 1, pattern: ONE_LINE },
    export: { type: "string", pattern: "^[A-Za-z_$][A-Za-z0-9_$]*$" },
    routes: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "path", "media"],
        additionalProperties: false,
        properties: {
          name: { type: "string", pattern: NAME },
          path: { type: "string", pattern: PATH },
          media: { type: ["string", "null"], pattern: MEDIA },
        },
      },
    },
  },
};

const same = (a: Contract, b: Contract) => a.id === b.id && a.version === b.version;
const show = (c: Contract) => `${c.id}@${c.version}`;
function check(pattern: string, value: string, what: string) {
  if (!new RegExp(pattern, "u").test(value))
    throw new Error(`${what}: ${JSON.stringify(value)} isn't allowed`);
}

/** Read a layout of routes into the route tree it describes. Each step's
 * output must be the next step's input, so a route is a connected path of
 * edges. Runs no edge. */
export function describe(routes: Routes, server: Server): RouteTree {
  const paths = new Set<string>();
  return {
    ...server,
    routes: Object.entries(routes).map(([name, route]) => {
      check(NAME, name, "route name");
      check(PATH, route.path, `${name} path`);
      if (paths.has(route.path)) throw new Error(`Two routes serve ${route.path}`);
      paths.add(route.path);
      if (!route.steps.length) throw new Error(`${name}: a route needs at least one edge`);
      route.steps.forEach((step, i) => {
        if (typeof step?.run !== "function" || !step.operation)
          throw new Error(`${name}: step ${i + 1} isn't an edge`);
        const before = route.steps[i - 1];
        if (before && !same(before.operation.output, step.operation.input))
          throw new Error(
            `${name}: step ${i + 1} takes ${show(step.operation.input)} but step ${i} gives ${show(before.operation.output)}`,
          );
      });
      const first = route.steps[0]!.inputSchema as
        | { type?: string; properties?: Record<string, { type?: string }> }
        | undefined;
      if (
        first?.type !== "object" ||
        Object.values(first.properties ?? {}).some((field) => field.type !== "string")
      )
        throw new Error(
          `${name}: the first edge needs an object input schema of strings, read from the query string`,
        );
      const output = route.steps.at(-1)!.operation.output.id;
      const media = output.startsWith(MEDIA_TYPES) ? output.slice(MEDIA_TYPES.length) : null;
      if (media !== null) check(MEDIA, media, `${name} media type`);
      return { name, path: route.path, media };
    }),
  };
}

const message: Estree = {
  type: "ConditionalExpression",
  test: { type: "BinaryExpression", operator: "instanceof", left: id("error"), right: id("Error") },
  consequent: member(id("error"), "message"),
  alternate: call(id("String"), id("error")),
};
const typed = (name: string, type: Value): Estree => ({
  ...binding(name),
  typeAnnotation: { type: "TSTypeAnnotation", typeAnnotation: type },
});
const returns = (argument: Estree): Estree => ({ type: "ReturnStatement", argument });

// async function run(steps: Implementation[], input: unknown) {
//   let current = artifact(steps[0].operation.input, input);
//   for (const step of steps) current = (await invoke(step, current)).artifact;
//   return current.value;
// }
const RUN: Estree = {
  type: "FunctionDeclaration",
  id: binding("run"),
  async: true,
  generator: false,
  params: [
    typed("steps", {
      type: "TSArrayType",
      elementType: { type: "TSTypeReference", typeName: id("Implementation") },
    }),
    typed("input", { type: "TSUnknownKeyword" }),
  ],
  body: block([
    declare(
      "let",
      "current",
      call(id("artifact"), member(element(id("steps"), 0), "operation", "input"), id("input")),
    ),
    {
      type: "ForOfStatement",
      await: false,
      left: declare("const", "step", null),
      right: id("steps"),
      body: statement({
        type: "AssignmentExpression",
        operator: "=",
        left: id("current"),
        right: member(
          { type: "AwaitExpression", argument: call(id("invoke"), id("step"), id("current")) },
          "artifact",
        ),
      }),
    },
    returns(member(id("current"), "value")),
  ]),
};

function handler(tree: RouteTree, route: RouteNode): Estree {
  const steps = member(id(tree.export), route.name, "steps");
  const body = route.media
    ? call(id("String"), id("body"))
    : call(member(id("JSON"), "stringify"), id("body"), literal(null), literal(2));
  const type = `${route.media ?? "application/json"}; charset=utf-8`;
  return {
    type: "ArrowFunctionExpression",
    params: [binding("c")],
    async: true,
    expression: false,
    body: block([
      {
        type: "TryStatement",
        block: block([
          constant("body", {
            type: "AwaitExpression",
            argument: call(id("run"), steps, call(member(id("c"), "req", "query"))),
          }),
          returns(
            construct(
              id("Response"),
              body,
              object([["headers", object([["content-type", literal(type)]])]]),
            ),
          ),
        ]),
        handler: {
          type: "CatchClause",
          param: binding("error"),
          body: block([
            returns(
              construct(
                id("Response"),
                message,
                object([
                  [
                    "status",
                    {
                      type: "ConditionalExpression",
                      test: {
                        type: "BinaryExpression",
                        operator: "instanceof",
                        left: id("error"),
                        right: id("InputError"),
                      },
                      consequent: literal(400),
                      alternate: literal(500),
                    },
                  ],
                ]),
              ),
            ),
          ]),
        },
      },
    ]),
  };
}

/** Build the ESTree program. Names are checked as they become nodes, and tree
 * text only ever appears as string literals. */
function lower(tree: RouteTree, from: Digest): Estree {
  const body: Estree[] = [
    {
      ...importFrom("hono", ["Hono"]),
      leadingComments: [
        lineComment(` Generated by @gooi/hono from route tree ${from}.`),
        lineComment(" Change the routes and regenerate, or take this file over: it runs the"),
        lineComment(" edges directly and doesn't need gooi's generic surfaces."),
      ],
    },
    importFrom("@gooi/exchange", ["InputError", "invoke"], ["Implementation"]),
    importFrom("@gooi/kernel/evidence", ["artifact"]),
    importFrom(tree.module, [tree.export]),
    RUN,
    constant("app", construct(id("Hono"))),
  ];
  const seen = new Set<string>();
  for (const route of tree.routes) {
    if (seen.has(route.name)) throw new Error(`Two routes named "${route.name}"`);
    seen.add(route.name);
    body.push(statement(call(member(id("app"), "get"), literal(route.path), handler(tree, route))));
  }
  body.push({ type: "ExportDefaultDeclaration", declaration: id("app"), exportKind: "value" });
  return { type: "Program", sourceType: "module", body };
}

/** The lowering edge: a route tree to the ESTree program of a Hono app. */
export const lowerToEstree: Implementation = edge(
  {
    operation: { input: ROUTE_TREE, output: ESTREE_PROGRAM },
    inputSchema: ROUTE_TREE_SCHEMA as Value,
    claim: LOWERED,
    scope:
      "Lowered this exact route tree to an ESTree program of a Hono app that imports only hono, @gooi/exchange, @gooi/kernel/evidence and the tree's module, with every name checked; excludes whether that module still exports matching routes",
  },
  (input) => lower(input.value as unknown as RouteTree, artifactId(input)),
);

/** Describe routes, lower them to ESTree, and print the program: every
 * artifact, the source, and the composed evidence across both hops. */
export async function compile(routes: Routes, server: Server) {
  const tree: Artifact = artifact(ROUTE_TREE, describe(routes, server));
  const lowered = await invoke(lowerToEstree, tree);
  const printed = await invoke(printTypeScript, lowered.artifact);
  return {
    tree,
    program: lowered.artifact,
    source: printed.artifact.value as string,
    traces: compose([lowered, printed]),
  };
}
