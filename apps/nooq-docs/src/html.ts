import type { Element, Root } from "hast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { toHast } from "mdast-util-to-hast";
import { gfm } from "micromark-extension-gfm";

/** Markdown to a whole hast document: mdast first, with GitHub's table syntax,
 * then hast. Raw HTML in the Markdown stays text: toHast drops it unless asked. */
export function toHtmlTree(markdown: string): Root {
  const body = toHast(fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }));
  const el = (tagName: string, properties: Element["properties"], children: Element["children"]): Element =>
    ({ type: "element", tagName, properties, children });
  return {
    type: "root",
    children: [
      { type: "doctype" },
      el("html", { lang: "en" }, [
        el("head", {}, [el("meta", { charSet: "utf-8" }, [])]),
        el("body", {}, body.type === "root" ? (body.children as Element["children"]) : [body as Element]),
      ]),
    ],
  };
}
