import type { Element, Root, RootContent } from "hast";
import { fromHtml } from "hast-util-from-html";
import { selectAll } from "hast-util-select";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { edge, invoke, type Implementation } from "@gooi/exchange";
import { compose } from "@gooi/kernel/compose";
import { artifact, artifactId } from "@gooi/kernel/evidence";
import type { Artifact, Digest, Value } from "@gooi/kernel/types";
import {
  ESTREE_PROGRAM,
  arrow,
  attribute,
  embed,
  id,
  importFrom,
  jsx,
  lineComment,
  literal,
  parseProgram,
  printTsx,
  spreadAttribute,
  type Node as Estree,
} from "@gooi/estree";
import { HAST, HTML } from "@gooi/hast";

/** This package's own dialect: selectors paired with what to render. */
export const MAPPING = Object.freeze({ id: "urn:gooi:react:mapping", version: 1 });
const LOWERED = Object.freeze({ id: "urn:gooi:react:lowered", version: 1 });
const RENDERED = Object.freeze({ id: "urn:gooi:react:rendered", version: 1 });
const ONE_LINE = "^[^\\u0000-\\u001f\\u007f\\u2028\\u2029]*$";
const COMPONENT = /^[A-Z][A-Za-z0-9]*$/u;
const INTRINSIC = /^[a-z][a-z0-9]*$/u;
/** HTML elements that can't have children. */
const VOID = new Set(
  "area base br col embed hr img input link meta source track wbr".split(" "),
);

/** One rule of a designer's mapping. The first rule whose CSS selector matches
 * an element decides how it renders. */
export interface Rule {
  /** A CSS selector, matched against the page's HTML syntax tree. */
  readonly match: string;
  /** A component name imported from `from`, an HTML element name, or null to leave the element out. */
  readonly as: string | null;
  /** The module that exports the component. Omit for HTML elements. */
  readonly from?: string;
  readonly className?: string;
  /** Fixed string props, such as `{ variant: "secondary" }`. */
  readonly props?: Readonly<Record<string, string>>;
}
export interface Mapping {
  readonly rules: readonly Rule[];
}
interface Described {
  readonly match: string;
  readonly as: string | null;
  readonly from: string | null;
  readonly className: string | null;
  readonly props: Readonly<Record<string, string>>;
}

const line = { type: "string", pattern: ONE_LINE };
const MAPPING_SCHEMA = {
  description: "Selectors paired with the component or element each match renders as",
  type: "object",
  required: ["rules"],
  additionalProperties: false,
  properties: {
    rules: {
      type: "array",
      items: {
        type: "object",
        required: ["match", "as", "from", "className", "props"],
        additionalProperties: false,
        properties: {
          match: { ...line, minLength: 1 },
          as: { type: ["string", "null"], pattern: "^[A-Za-z][A-Za-z0-9]*$" },
          from: { type: ["string", "null"], minLength: 1, pattern: ONE_LINE },
          className: { type: ["string", "null"], pattern: ONE_LINE },
          props: {
            type: "object",
            propertyNames: { pattern: "^[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*$" },
            additionalProperties: line,
          },
        },
      },
    },
  },
};

/** Check a mapping and fill in its defaults. Selectors are parsed now, so a
 * bad one fails before any code exists. */
export function describe(mapping: Mapping): { readonly rules: readonly Described[] } {
  const empty: Root = { type: "root", children: [] };
  return {
    rules: mapping.rules.map((rule, i) => {
      const where = `rule ${i + 1} (${rule.match})`;
      try {
        selectAll(rule.match, empty);
      } catch (error) {
        throw new Error(`${where}: not a CSS selector: ${(error as Error).message}`);
      }
      if (rule.as !== null) {
        const component = rule.from !== undefined;
        if (component ? !COMPONENT.test(rule.as) : !INTRINSIC.test(rule.as))
          throw new Error(
            `${where}: ${component ? "components are capitalized" : "HTML elements are lowercase"}; got "${rule.as}"`,
          );
      }
      return {
        match: rule.match,
        as: rule.as,
        from: rule.from ?? null,
        className: rule.className ?? null,
        props: rule.props ?? {},
      };
    }),
  };
}

// Fixed code around the rules; parsed, never assembled from data.
const PRELUDE = `
import { createElement, type ReactNode } from "react";
import { selectAll } from "hast-util-select";
import type { Element, Root, RootContent } from "hast";
`;
const MAKE = `type Make = (key: number, props: Record<string, unknown>, children: ReactNode[]) => ReactNode;`;
const RULES = `const rules: [string, Make][] = [];`;
const RENDER = `
function attributes(properties: Element["properties"]): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(properties)) {
    if (/^on[A-Z]/.test(name) || value === undefined || value === null) continue;
    props[name] = Array.isArray(value) ? value.join(" ") : value;
  }
  return props;
}

export function render(tree: Root): ReactNode {
  const chosen = new Map<Element, Make>();
  for (const [selector, make] of rules) {
    for (const node of selectAll(selector, tree)) {
      if (!chosen.has(node)) chosen.set(node, make);
    }
  }
  let key = 0;
  const visit = (node: Root | RootContent): ReactNode => {
    if (node.type === "text") return node.value;
    if (node.type === "root") return node.children.map(visit);
    if (node.type !== "element") return null;
    const children = node.children.map(visit);
    const make = chosen.get(node);
    const props = attributes(node.properties);
    return make ? make(key++, props, children) : createElement(node.tagName, { ...props, key: key++ }, ...children);
  };
  return visit(tree);
}
`;

function make(rule: Described): Estree {
  if (rule.as === null) return arrow([], literal(null));
  const own = [
    attribute("key", id("key")),
    spreadAttribute(id("props")),
    ...(rule.className === null ? [] : [attribute("className", rule.className)]),
    ...Object.entries(rule.props).map(([name, value]) => attribute(name, value)),
  ];
  const empty = rule.from === null && VOID.has(rule.as);
  return arrow(
    ["key", "props", "children"],
    jsx(rule.as, own, empty ? [] : [embed(id("children"))]),
  );
}

/** Build the TSX program: fixed code parsed from constants, and the rules
 * built from checked nodes, where mapping text only ever becomes literals. */
function lower(mapping: { readonly rules: readonly Described[] }, from: Digest): Estree {
  const prelude = parseProgram(PRELUDE, "tsx");
  const modules = new Map<string, Set<string>>();
  for (const rule of mapping.rules)
    if (rule.from !== null && rule.as !== null)
      modules.set(rule.from, (modules.get(rule.from) ?? new Set()).add(rule.as));
  const [declaration] = parseProgram(RULES, "tsx") as [Estree & { declarations: Estree[] }];
  const rules = {
    ...declaration,
    declarations: [
      {
        ...declaration.declarations[0]!,
        init: {
          type: "ArrayExpression",
          elements: mapping.rules.map((rule) => ({
            type: "ArrayExpression",
            elements: [literal(rule.match), make(rule)],
          })),
        },
      },
    ],
  };
  return {
    type: "Program",
    sourceType: "module",
    body: [
      {
        ...prelude[0]!,
        leadingComments: [
          lineComment(` Generated by @gooi/react from mapping ${from}.`),
          lineComment(" Change the mapping and regenerate, or take this file over: it renders"),
          lineComment(" any page tree with these components and doesn't need gooi."),
        ],
      },
      ...prelude.slice(1),
      ...[...modules].map(([module, names]) => importFrom(module, [...names])),
      ...parseProgram(MAKE, "tsx"),
      rules,
      ...parseProgram(RENDER, "tsx"),
    ],
  };
}

/** The lowering edge: a mapping to the TSX program of a React renderer. */
export const lowerToEstree: Implementation = edge(
  {
    operation: { input: MAPPING, output: ESTREE_PROGRAM },
    inputSchema: MAPPING_SCHEMA as Value,
    claim: LOWERED,
    scope:
      "Lowered this exact mapping to an ESTree program whose rules render each matched element as the named component or element, with every name checked; excludes how the components look",
  },
  (input) => lower(input.value as never, artifactId(input)),
);

/** Describe a mapping, lower it, and print it as TSX, with the composed evidence. */
export async function compile(mapping: Mapping) {
  const described: Artifact = artifact(MAPPING, describe(mapping));
  const lowered = await invoke(lowerToEstree, described);
  const printed = await invoke(printTsx, lowered.artifact);
  return {
    mapping: described,
    program: lowered.artifact,
    source: printed.artifact.value as string,
    traces: compose([lowered, printed]),
  };
}

const HIDDEN = new Set(["script", "style", "template", "noscript"]);
const UNSAFE = new Set(["script", "iframe", "object", "embed"]);
function body(tree: Root): Element | undefined {
  return selectAll("body", tree)[0];
}
function words(node: Root | RootContent | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value;
  if (node.type === "element" && HIDDEN.has(node.tagName)) return "";
  if (node.type !== "element" && node.type !== "root") return "";
  return node.children.map(words).join("");
}
const collapse = (text: string) => text.replace(/\s+/gu, " ").trim();
function unsafe(node: Root | RootContent): string | null {
  if (node.type !== "element" && node.type !== "root") return null;
  if (node.type === "element") {
    if (UNSAFE.has(node.tagName)) return `a <${node.tagName}> element`;
    for (const [name, value] of Object.entries(node.properties)) {
      if (/^on[A-Z]/u.test(name)) return `an ${name} handler`;
      if (typeof value === "string" && /^\s*javascript:/iu.test(value)) return "a javascript: URL";
    }
  }
  for (const child of node.children) {
    const found = unsafe(child);
    if (found) return found;
  }
  return null;
}

/** A page edge: render a hast document with a React renderer and refuse
 * unless the HTML says what the view said (the same body text, in order) and
 * adds no scripts, event handlers or javascript: URLs. */
export function reactPage(render: (tree: Root) => ReactNode): Implementation {
  return edge(
    {
      operation: { input: HAST, output: HTML },
      inputSchema: {
        type: "object",
        required: ["type", "children"],
        properties: { type: { const: "root" }, children: { type: "array" } },
      },
      claim: RENDERED,
      scope:
        "Rendered this hast document with React components, then read the HTML back: same body text in the same order, and no scripts, event handlers or javascript: URLs; excludes how it looks",
    },
    (input) => {
      const tree = input.value as unknown as Root;
      const document = tree.children[0]?.type === "doctype";
      const html = `${document ? "<!doctype html>" : ""}${renderToString(render(tree))}`;
      const back = fromHtml(html, { fragment: !document });
      const said = (t: Root) => collapse(words(document ? body(t) : t));
      if (said(back) !== said(tree))
        throw new Error("The rendered page doesn't say what the view said");
      const problem = unsafe(back);
      if (problem) throw new Error(`The rendered page adds ${problem}`);
      return html;
    },
  );
}
