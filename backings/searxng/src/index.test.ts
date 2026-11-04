import { expect, test } from "bun:test";
import { duckdb } from "@gooi/duckdb";
import { searxng } from "./index.js";

const asked: URL[] = [];
const fake = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  asked.push(url);
  return Response.json({ results: [
    { url: "https://duckdb.org/", title: "DuckDB &amp; friends", content: "An <b>analytical</b>\n database", engines: ["bing", "yahoo"], publishedDate: null },
    { url: "javascript:alert(1)", title: "Not a page", content: "" },
    { url: "https://en.wikipedia.org/wiki/DuckDB", title: "DuckDB - Wikipedia", content: "Column-oriented", engine: "bing", publishedDate: "2026-11-01T00:00:00" },
  ] });
}) as unknown as typeof fetch;
const engine = searxng({ url: "http://searx.test/", fetch: fake });

test("search keeps http(s) results, in rank order, with their text", async () => {
  expect(await engine.search("duckdb")).toEqual([
    { rank: 1, title: "DuckDB & friends", url: "https://duckdb.org/", snippet: "An analytical database", engines: ["bing", "yahoo"], published: null },
    { rank: 2, title: "DuckDB - Wikipedia", url: "https://en.wikipedia.org/wiki/DuckDB", snippet: "Column-oriented", engines: ["bing"], published: "2026-11-01T00:00:00.000Z" },
  ]);
  expect(Object.fromEntries(asked.at(-1)!.searchParams)).toEqual({ q: "duckdb", format: "json" });
  await expect(engine.search("  ")).rejects.toThrow("A web search needs words to search for");
});

test("one query over the web: its search is pushed down from WHERE query = '...'", async () => {
  const answer = await duckdb().query(
    "SELECT rank, title FROM web WHERE query = 'duckdb pushdown' AND url LIKE '%wikipedia%'",
    { relations: { web: engine.web } },
  );
  expect(answer.table.data).toEqual([{ rank: 2, title: "DuckDB - Wikipedia" }]);
  expect(answer.pushed.web).toEqual({ filters: [{ column: "query", op: "=", value: "duckdb pushdown" }], rows: 2 });
  expect(asked.at(-1)!.searchParams.get("q")).toBe("duckdb pushdown");
});

test("the web refuses a query without a search, and two searches match nothing", async () => {
  await expect(duckdb().query("SELECT title FROM web", { relations: { web: engine.web } }))
    .rejects.toThrow("The web can only be queried for a search: add WHERE query = '...'");
  const none = await duckdb().query("SELECT title FROM web WHERE query = 'a' AND query = 'b'", { relations: { web: engine.web } });
  expect(none.table.data).toEqual([]);
});

test("a SearXNG that's down or failing says so", async () => {
  const down = searxng({ url: "http://searx.test", fetch: (async () => { throw new Error("connection refused"); }) as unknown as typeof fetch });
  await expect(down.search("x")).rejects.toThrow("SearXNG at http://searx.test didn't answer: connection refused");
  const failing = searxng({ url: "http://searx.test", fetch: (async () => new Response("", { status: 429 })) as unknown as typeof fetch });
  await expect(failing.search("x")).rejects.toThrow("SearXNG at http://searx.test answered 429");
});
