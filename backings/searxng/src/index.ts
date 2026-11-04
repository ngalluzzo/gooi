import type { Relation, Row } from "@gooi/duckdb";

// SearXNG's JSON API (GET /search?format=json). It's a local metasearch
// engine: queries stay on your machine except for the engines it asks.

export interface SearxngOptions {
  /** Defaults to the loopback instance, http://127.0.0.1:8888. */
  readonly url?: string;
  readonly fetch?: typeof fetch;
  /** Milliseconds before a search gives up. */
  readonly timeout?: number;
}

export interface Result {
  readonly rank: number;
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly engines: readonly string[];
  readonly published: string | null;
}

interface SearxngResult {
  url?: unknown;
  title?: unknown;
  content?: unknown;
  engine?: unknown;
  engines?: unknown;
  publishedDate?: unknown;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Snippets can arrive as HTML fragments; keep their text. */
function text(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/gu, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (match, name: string) =>
      name.startsWith("#x") ? String.fromCodePoint(parseInt(name.slice(2), 16))
        : name.startsWith("#") ? String.fromCodePoint(Number(name.slice(1)))
          : ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/gu, " ")
    .trim();
}

export function searxng(options: SearxngOptions = {}) {
  const base = (options.url ?? "http://127.0.0.1:8888").replace(/\/$/u, "");
  const request = options.fetch ?? fetch;

  async function search(query: string): Promise<Result[]> {
    if (!query.trim()) throw new Error("A web search needs words to search for");
    const url = `${base}/search?${new URLSearchParams({ q: query, format: "json" })}`;
    const response = await request(url, { signal: AbortSignal.timeout(options.timeout ?? 15000) })
      .catch((error: Error) => { throw new Error(`SearXNG at ${base} didn't answer: ${error.message}`); });
    if (!response.ok) throw new Error(`SearXNG at ${base} answered ${response.status}`);
    const body = await response.json() as { results?: SearxngResult[] };
    return (body.results ?? [])
      .filter((r) => typeof r.url === "string" && /^https?:\/\//u.test(r.url))
      .map((r, i) => ({
        rank: i + 1,
        title: text(r.title),
        url: String(r.url),
        snippet: text(r.content),
        engines: Array.isArray(r.engines) ? r.engines.map(String) : r.engine ? [String(r.engine)] : [],
        published: typeof r.publishedDate === "string" && !Number.isNaN(Date.parse(r.publishedDate))
          ? new Date(r.publishedDate).toISOString() : null,
      }));
  }

  /** The web as a relation: every row answers the search in its query column,
   * which a query must fix with WHERE query = '...'. */
  const web: Relation = {
    schema: { fields: [
      { name: "query", type: "string", description: "The search; fix it with WHERE query = '...'" },
      { name: "rank", type: "integer" },
      { name: "title", type: "string" },
      { name: "url", type: "string" },
      { name: "snippet", type: "string" },
      { name: "engines", type: "array" },
      { name: "published", type: "datetime" },
    ] },
    pushable: { query: ["="] },
    async fetch(filters) {
      const searches = [...new Set(filters.filter((f) => f.column === "query" && f.op === "=").map((f) => String(f.value)))];
      if (!searches.length) throw new Error("The web can only be queried for a search: add WHERE query = '...'");
      // Two different searches can't both equal one row's query, so nothing matches.
      if (searches.length > 1) return [];
      const [query] = searches as [string];
      return (await search(query)).map((result): Row => ({ query, ...result }));
    },
  };

  return { search, web };
}

export type Searxng = ReturnType<typeof searxng>;
