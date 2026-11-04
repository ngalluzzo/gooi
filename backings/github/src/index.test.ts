import { expect, test } from "bun:test";
import { duckdb } from "@gooi/duckdb";
import openapi from "./openapi-issues.json";
import { issues, parameters } from "./index.js";

const issue = (number: number, state: string, labels: string[], extra: object = {}) => ({
  number, title: `Issue ${number}`, state, user: { login: "nic" }, labels: labels.map((name) => ({ name })),
  assignees: [], comments: 0, created_at: "2026-11-01T00:00:00Z", updated_at: `2026-11-0${number}T00:00:00Z`,
  closed_at: state === "closed" ? "2026-11-03T00:00:00Z" : null, html_url: `https://github.com/o/r/issues/${number}`, ...extra,
});

/** GitHub's issues endpoint over fixed issues: it applies state, labels and since, pages by two, and records each request. */
function fakeGitHub() {
  const all = [issue(1, "closed", ["bug"]), issue(2, "open", ["ui"]), issue(3, "open", ["bug", "export"]),
    issue(4, "open", [], { pull_request: {} }), issue(5, "open", ["bug"])];
  const requests: URL[] = [];
  const handler = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    requests.push(url);
    const state = url.searchParams.get("state") ?? "open";
    const labels = url.searchParams.get("labels")?.split(",") ?? [];
    const since = url.searchParams.get("since");
    const matching = all.filter((i) => (state === "all" || i.state === state)
      && labels.every((l) => i.labels.some((x) => x.name === l))
      && (!since || i.updated_at > since));
    const page = Number(url.searchParams.get("page") ?? "1");
    const next = new URL(url);
    next.searchParams.set("page", String(page + 1));
    const headers = page * 2 < matching.length ? { link: `<${next}>; rel="next", <${url}>; rel="last"` } : {};
    return Response.json(matching.slice((page - 1) * 2, page * 2), { headers: headers as HeadersInit });
  };
  return { requests, fetch: handler as unknown as typeof fetch };
}

test("the relation asks GitHub with its own parameters, as its published OpenAPI description names them", () => {
  expect(openapi.operationId).toBe("issues/list-for-repo");
  const names = new Map(openapi.parameters.map((p) => [p.name, p.schema as { enum?: string[] }]));
  for (const name of ["state", "creator", "assignee", "labels", "since", "per_page", "page"]) expect(names.has(name), name).toBe(true);
  expect(names.get("state")!.enum).toEqual(["open", "closed", "all"]);
  for (const field of ["number", "title", "state", "user", "labels", "assignees", "comments", "created_at", "updated_at", "closed_at", "html_url", "pull_request"])
    expect(openapi.issueFields, field).toContain(field);
});

test("filters become GitHub parameters; with no state filter it asks for all, since GitHub defaults to open", () => {
  expect(String(parameters([]).params)).toBe("state=all");
  const { params, used } = parameters([
    { column: "state", op: "=", value: "open" },
    { column: "labels", op: "contains", value: "bug" },
    { column: "labels", op: "contains", value: "ui" },
    { column: "updated_at", op: ">=", value: "2026-11-02T00:00:00Z" },
    { column: "labels", op: "contains", value: "a,b" },
  ]);
  expect(Object.fromEntries(params)).toEqual({ state: "open", labels: "bug,ui", since: "2026-11-01T23:59:59.000Z" });
  expect(used).toHaveLength(4);
});

test("one query over GitHub issues pushes its filters into the request and pages through Link headers", async () => {
  const github = fakeGitHub();
  const relation = issues({ repo: "o/r", fetch: github.fetch, baseUrl: "https://api.github.test" });
  const answer = await duckdb().query(
    "SELECT number, labels FROM issues WHERE state = 'open' AND list_contains(labels, 'bug') ORDER BY number",
    { relations: { issues: relation } },
  );
  expect(answer.table.data).toEqual([{ number: 3, labels: ["bug", "export"] }, { number: 5, labels: ["bug"] }]);
  expect(github.requests[0]!.searchParams.get("state")).toBe("open");
  expect(github.requests[0]!.searchParams.get("labels")).toBe("bug");

  const everything = await duckdb().query("SELECT number, state FROM issues ORDER BY number", { relations: { issues: relation } });
  expect(everything.table.data.map((row) => row.number)).toEqual([1, 2, 3, 5]);
  expect(github.requests.slice(1).map((url) => url.searchParams.get("page") ?? "1")).toEqual(["1", "2", "3"]);
});

test("a query that needs more pages than allowed fails instead of reading part, and GitHub's errors come through", async () => {
  const github = fakeGitHub();
  const small = issues({ repo: "o/r", fetch: github.fetch, baseUrl: "https://api.github.test", maxPages: 1 });
  await expect(small.fetch([])).rejects.toThrow("o/r has more than 1 pages of issues for this query");
  const limited = issues({
    repo: "o/r", baseUrl: "https://api.github.test",
    fetch: (async () => Response.json({ message: "API rate limit exceeded" }, { status: 403 })) as unknown as typeof fetch,
  });
  await expect(limited.fetch([])).rejects.toThrow("GitHub answered 403 for o/r's issues: API rate limit exceeded");
  expect(() => issues({ repo: "not a repo" })).toThrow("Expected a repository as owner/name");
});

test("a token, when given, is sent as a bearer token and never in the URL", async () => {
  let seen: Headers | undefined, url = "";
  const relation = issues({
    repo: "o/r", baseUrl: "https://api.github.test", token: () => "secret-token",
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      url = String(input);
      seen = new Headers(init?.headers);
      return Response.json([]);
    }) as unknown as typeof fetch,
  });
  await relation.fetch([]);
  expect(seen!.get("authorization")).toBe("Bearer secret-token");
  expect(url).not.toContain("secret-token");
});
