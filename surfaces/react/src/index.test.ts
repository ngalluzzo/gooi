import { describe as group, expect, test } from "bun:test";
import type { Element, Root, RootContent } from "hast";
import { createElement, type ReactNode } from "react";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { parsesTo } from "@gooi/estree";
import { HAST } from "@gooi/hast";
import { MAPPING, compile, describe, lowerToEstree, reactPage, type Mapping } from "./index.js";

const mapping: Mapping = {
  rules: [
    { match: "head > style", as: "link", props: { rel: "stylesheet", href: "/x.css" } },
    { match: "li.done .title", as: "span", className: "line-through" },
    { match: "ul", as: "Card", from: "@/components/ui/card", className: "gap-0" },
    { match: ".meta", as: "Badge", from: "@/components/ui/badge", props: { variant: "secondary" } },
    { match: "footer", as: null },
  ],
};

group("describe and lower", () => {
  test("lowers a mapping to a TSX renderer that parses back", async () => {
    const { program, source, traces } = await compile(mapping);
    expect(source).toContain('import { Card } from "@/components/ui/card";');
    expect(source).toContain('<link key={key} {...props} rel="stylesheet" href="/x.css" />');
    expect(source).toContain('<Card key={key} {...props} className="gap-0">{children}</Card>');
    expect(source).toContain('["footer", () => null]');
    expect(source).toContain("export function render(tree: Root): ReactNode");
    expect(parsesTo(source, program.value as never, "tsx")).toBe(true);
    expect(traces[0]).toMatchObject({ verdict: "passed", missingStage: null });
  });

  test("refuses mappings that can't be rendered as written", () => {
    for (const [rule, problem] of [
      [{ match: "ul >", as: "div" }, "not a CSS selector"],
      [{ match: "ul", as: "card", from: "@/x" }, "components are capitalized"],
      [{ match: "ul", as: "Div" }, "HTML elements are lowercase"],
    ] as const)
      expect(() => describe({ rules: [rule] })).toThrow(problem);
  });

  test("keeps mapping text in literals, and refuses what the dialect forbids", async () => {
    const odd = await compile({ rules: [{ match: "a[title='x\"y']", as: "a", className: 'a" onClick="evil()' }] });
    expect(odd.source).toContain('className={"a\\" onClick=\\"evil()"}');
    const rule = { match: "ul", as: "div", from: null, className: null, props: {} };
    for (const [patch, problem] of [
      [{ match: "ul\n} evil()" }, "match must match pattern"],
      [{ from: "./x\nevil()" }, "from must match pattern"],
      [{ props: { 'x" y': "z" } }, "props must match pattern"],
    ] as const)
      await expect(
        invoke(lowerToEstree, artifact(MAPPING, { rules: [{ ...rule, ...patch }] })),
      ).rejects.toThrow(problem);
  });
});

group("reactPage", () => {
  const page: Root = {
    type: "root",
    children: [
      { type: "doctype" },
      {
        type: "element",
        tagName: "html",
        properties: {},
        children: [
          { type: "element", tagName: "head", properties: {}, children: [] },
          {
            type: "element",
            tagName: "body",
            properties: {},
            children: [
              {
                type: "element",
                tagName: "ul",
                properties: {},
                children: [
                  {
                    type: "element",
                    tagName: "li",
                    properties: {},
                    children: [{ type: "text", value: "<script>alert(1)</script> & co" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  // A small hand-written renderer: lists become divs; `change` can misbehave.
  const renderer =
    (change: (node: Element, children: ReactNode[]) => ReactNode | undefined = () => undefined) =>
    (tree: Root): ReactNode => {
      let key = 0;
      const visit = (node: Root | RootContent): ReactNode => {
        if (node.type === "text") return node.value;
        if (node.type === "root") return node.children.map(visit);
        if (node.type !== "element") return null;
        const children = node.children.map(visit);
        const changed = change(node, children);
        if (changed !== undefined) return changed;
        const tag = node.tagName === "ul" ? "div" : node.tagName;
        return createElement(tag, { key: key++ }, ...children);
      };
      return visit(tree);
    };
  const run = (render: (tree: Root) => ReactNode) => invoke(reactPage(render), artifact(HAST, page));

  test("renders with different elements but the same text, escaped", async () => {
    const html = (await run(renderer())).artifact.value as string;
    expect(html).toStartWith("<!doctype html><html>");
    expect(html).toContain("<div><li>&lt;script&gt;alert(1)&lt;/script&gt; &amp; co</li></div>");
  });

  test("refuses a renderer that changes what the page says or adds code", async () => {
    const cases: [Parameters<typeof renderer>[0], string][] = [
      [(node) => (node.tagName === "li" ? createElement("li", { key: "x" }) : undefined), "doesn't say what the view said"],
      [(node, children) => (node.tagName === "li" ? createElement("li", { key: "x" }, ...children, " extra") : undefined), "doesn't say what the view said"],
      [(node, children) => (node.tagName === "body" ? createElement("body", { key: "b" }, ...children, createElement("script", { key: "s" })) : undefined), "adds a <script> element"],
      [(node, children) => (node.tagName === "li" ? createElement("li", { key: "l", dangerouslySetInnerHTML: { __html: '<img src=x onerror="evil()">' } }) : undefined), "doesn't say what the view said"],
      [(node, children) => (node.tagName === "body" ? createElement("body", { key: "b" }, ...children, createElement("img", { key: "i", src: "javascript:evil()" })) : undefined), "adds a javascript: URL"],
    ];
    for (const [change, problem] of cases) await expect(run(renderer(change))).rejects.toThrow(problem);
  });
});
