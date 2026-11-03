import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import { edge, type Implementation } from "@gooi/exchange";
import { canonical } from "@gooi/kernel/value";

/** A hast root: the HTML syntax tree of syntax-tree, version 3. An existing
 * standard that gooi only names. */
export const HAST = Object.freeze({ id: "https://github.com/syntax-tree/hast", version: 3 });
/** HTML text, named by its IANA media type registration. */
export const HTML = Object.freeze({
  id: "https://www.iana.org/assignments/media-types/text/html",
  version: 1,
});
/** CSS text, named by its IANA media type registration. */
export const CSS = Object.freeze({
  id: "https://www.iana.org/assignments/media-types/text/css",
  version: 1,
});
const PRINTED = Object.freeze({ id: "urn:gooi:hast:printed-html", version: 1 });

/** Drop positions and parser data, keeping the document's meaning. */
function normalize(node: unknown): string {
  return canonical(
    JSON.parse(JSON.stringify(node, (key, value) => (key === "position" || key === "data" ? undefined : value))),
  );
}

/** Print a hast tree as HTML, refused unless the HTML parses back to the same
 * tree. A tree that starts with a doctype is parsed as a whole document. */
export const printHtml: Implementation = edge(
  {
    operation: { input: HAST, output: HTML },
    inputSchema: {
      type: "object",
      required: ["type", "children"],
      properties: { type: { const: "root" }, children: { type: "array" } },
    },
    claim: PRINTED,
    scope:
      "Printed this hast tree as HTML, then parsed the HTML back to the same tree, ignoring positions; excludes how a browser displays it",
  },
  (input) => {
    const tree = input.value as unknown as { children: { type: string }[] };
    const html = toHtml(tree as never);
    const document = tree.children[0]?.type === "doctype";
    if (normalize(fromHtml(html, { fragment: !document })) !== normalize(tree))
      throw new Error("The printed HTML doesn't parse back to the same tree");
    return html;
  },
);
