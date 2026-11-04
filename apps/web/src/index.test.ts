import { expect, test } from "bun:test";
import { invoke, type Implementation } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { pages } from "@gooi/pages";
import { searxng } from "@gooi/searxng";
import { web } from "./index.js";
import { pageMarkdown } from "./markdown.js";

const PAGE = `<!doctype html><html><head><title>DuckDB  Pushdown</title><style>p{}</style><script>alert(1)</script></head>
<body><nav><a href="/">Home</a></nav><main><h1>Filter pushdown</h1>
<p>DuckDB pushes <strong>filters</strong> into <a href="https://duckdb.org/scan">scans</a>.</p>
<table><tr><th>Operator</th><th>Pushed</th></tr><tr><td>=</td><td>yes</td></tr></table>
<form><input name="q"></form><img src="x.png" alt="chart"></main><footer>© someone</footer></body></html>`;

test("a page becomes Markdown through hast and mdast: main content only, nothing that runs", () => {
  const { title, markdown } = pageMarkdown(PAGE, "https://example.com/pushdown");
  expect(title).toBe("DuckDB Pushdown");
  expect(markdown).toBe([
    "# DuckDB Pushdown", "", "Source: <https://example.com/pushdown>", "",
    "# Filter pushdown", "",
    "DuckDB pushes **filters** into [scans](https://duckdb.org/scan).", "",
    "| Operator | Pushed |", "| -------- | ------ |", "| =        | yes    |",
  ].join("\n"));
  expect(markdown).not.toContain("alert");
  expect(markdown).not.toContain("Home");
  expect(markdown).not.toContain("someone");
  expect(pageMarkdown("<p>" + "x".repeat(200) + "</p>", "https://e.com", 80).markdown).toEndWith("(Cut at 80 characters.)");
});

const engine = searxng({
  url: "http://searx.test",
  fetch: (async () => Response.json({ results: Array.from({ length: 12 }, (_, i) => ({ url: `https://e.com/${i}`, title: `R${i}`, content: "s" })) })) as unknown as typeof fetch,
});
const reader = pages({
  lookup: async () => [{ address: "93.184.216.34" }],
  fetch: (async (input: RequestInfo | URL) => String(input).endsWith(".txt")
    ? new Response("plain words", { headers: { "content-type": "text/plain" } })
    : String(input).endsWith("/old")
      ? new Response('<meta http-equiv="refresh" content="0; url=/pushdown"><p>Redirecting…</p>', { headers: { "content-type": "text/html" } })
      : String(input).endsWith("/sneaky")
        ? new Response('<meta http-equiv="Refresh" content="0;URL=http://169.254.169.254/">', { headers: { "content-type": "text/html" } })
        : new Response(PAGE, { headers: { "content-type": "text/html" } })) as unknown as typeof fetch,
});
const app = web({ search: engine.search, pages: reader });
const run = async (edge: Implementation, value: object) =>
  (await invoke(edge, artifact(edge.operation.input, value as never))).artifact.value;

test("search answers a table, ten results by default", async () => {
  const table = await run(app.search, { query: "duckdb" }) as { data: { rank: number }[]; schema: { fields: { name: string }[] } };
  expect(table.data.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(table.schema.fields.map((field) => field.name)).toEqual(["rank", "title", "url", "snippet", "engines", "published"]);
  expect(((await run(app.search, { query: "duckdb", max: "3" })) as { data: unknown[] }).data).toHaveLength(3);
});

test("read gives Markdown for HTML and the text itself for plain pages; local addresses are refused", async () => {
  expect(await run(app.read, { url: "https://example.com/pushdown" })).toStartWith("# DuckDB Pushdown");
  expect(await run(app.read, { url: "https://example.com/notes.txt" })).toBe("Source: <https://example.com/notes.txt>\n\nplain words");
  await expect(run(app.read, { url: "http://127.0.0.1:8888/" })).rejects.toThrow("is a local or private address");
  expect(await run(app.read, { url: "https://example.com/old" })).toStartWith("# DuckDB Pushdown\n\nSource: <https://example.com/pushdown>");
  await expect(run(app.read, { url: "https://example.com/sneaky" })).rejects.toThrow("is a local or private address");
});
