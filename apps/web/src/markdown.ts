import type { Element, Nodes, Root, RootContent } from "hast";
import { fromHtml } from "hast-util-from-html";
import { select, selectAll } from "hast-util-select";
import { toMdast } from "hast-util-to-mdast";
import { toString } from "hast-util-to-string";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";

// A page as Markdown, through existing syntax trees: HTML to hast, hast to
// mdast, mdast to Markdown. Nothing is pasted together, and nothing from the
// page runs: scripts, styles, forms and media are dropped with the chrome.

const CHROME = new Set(["script", "style", "noscript", "template", "nav", "header", "footer", "aside", "form", "iframe", "svg", "img", "picture", "video", "audio", "button"]);

function strip(node: Root | Element): void {
  node.children = node.children.filter((child: RootContent) =>
    child.type !== "comment" && !(child.type === "element" && CHROME.has(child.tagName)));
  for (const child of node.children) if (child.type === "element") strip(child);
}

/** The page's main content as Markdown, under its title, capped at `limit` characters. */
export function pageMarkdown(html: string, url: string, limit = 60_000): { title: string; markdown: string } {
  const tree = fromHtml(html);
  const title = toString(select("title", tree) as Nodes ?? { type: "root", children: [] }).trim().replace(/\s+/gu, " ");
  const main = select("main", tree) ?? select("article", tree) ?? select("body", tree);
  const content: Root = { type: "root", children: main ? [structuredClone(main)] : [] };
  strip(content);
  const body = toMarkdown(toMdast(content), { extensions: [gfmToMarkdown()] }).trim();
  const head = `# ${title || url}\n\nSource: <${url}>`;
  const markdown = `${head}\n\n${body}`;
  return {
    title,
    markdown: markdown.length > limit ? `${markdown.slice(0, limit)}\n\n(Cut at ${limit} characters.)` : markdown,
  };
}

/** Where a page's <meta http-equiv="refresh"> sends the reader, if anywhere. */
export function refreshTarget(html: string, base: string): string | undefined {
  const tree = fromHtml(html);
  for (const meta of selectAll("meta", tree)) {
    if (String(meta.properties.httpEquiv ?? "").toLowerCase() !== "refresh") continue;
    const target = String(meta.properties.content ?? "").match(/url\s*=\s*['"]?([^'"\s]+)/iu)?.[1];
    if (!target) continue;
    try { return new URL(target, base).href; } catch { return undefined; }
  }
  return undefined;
}
