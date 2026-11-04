import { TABLE } from "@gooi/duckdb";
import { edge } from "@gooi/exchange";
import type { Value } from "@gooi/kernel/types";
import type { Pages } from "@gooi/pages";
import type { Searxng } from "@gooi/searxng";
import { pageMarkdown, refreshTarget } from "./markdown.js";

const contract = (name: string) => Object.freeze({ id: `urn:gooi:web:${name}`, version: 1 });
export const MARKDOWN = Object.freeze({ id: "https://www.iana.org/assignments/media-types/text/markdown", version: 1 });

export interface WebOptions {
  readonly search: Searxng["search"];
  readonly pages: Pages;
}

/** Web search and page reading as edges, for commands, MCP and agents' tools.
 * Both only read. */
export function web({ search, pages }: WebOptions) {
  const searchEdge = edge({
    operation: { input: contract("search"), output: TABLE },
    inputSchema: {
      type: "object",
      description: "Search the web through SearXNG; answers in rank order with title, url and snippet",
      properties: {
        query: { type: "string", minLength: 1, maxLength: 500, description: "What to search for" },
        max: { type: "string", pattern: "^[1-9][0-9]?$", description: "The most results to return, up to 99; 10 by default" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    claim: contract("searched"),
    scope: "Searched SearXNG for the query and kept its http(s) results in rank order; excludes whether they're true",
  }, async (input) => {
    const { query, max } = input.value as { query: string; max?: string };
    const results = (await search(query)).slice(0, Number(max ?? "10"));
    return {
      type: "table",
      schema: { fields: [
        { name: "rank", type: "integer" }, { name: "title", type: "string" }, { name: "url", type: "string" },
        { name: "snippet", type: "string" }, { name: "engines", type: "array" }, { name: "published", type: "datetime" },
      ] },
      data: results,
    } as unknown as Value;
  });

  const read = edge({
    operation: { input: contract("read"), output: MARKDOWN },
    inputSchema: {
      type: "object",
      description: "Read a public web page as Markdown: its main content, without scripts, navigation or media",
      properties: { url: { type: "string", minLength: 1, maxLength: 2000, description: "An http or https URL" } },
      required: ["url"],
      additionalProperties: false,
    },
    claim: contract("read-page"),
    scope: "Fetched a public page (never a local or private address) within size and time limits and converted its main content to Markdown through hast and mdast",
  }, async (input) => {
    let page = await pages.get((input.value as { url: string }).url);
    if (page.contentType === "text/plain" || page.contentType === "text/markdown")
      return `Source: <${page.url}>\n\n${page.text}`;
    // Some sites redirect with <meta http-equiv="refresh">; each hop goes through the same checks.
    for (let hops = 0; hops < 3; hops++) {
      const target = refreshTarget(page.text, page.url);
      if (!target || target === page.url) break;
      page = await pages.get(target);
    }
    return pageMarkdown(page.text, page.url).markdown;
  });

  return { search: searchEdge, read };
}
