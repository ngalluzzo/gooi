import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { duckdb } from "@gooi/duckdb";
import { invoke, path, type Implementation } from "@gooi/exchange";
import { printHtml } from "@gooi/hast";
import { issues } from "@gooi/github";
import { artifact } from "@gooi/kernel/evidence";
import { tasks as tasksApp } from "@gooi/tasks";
import { fileFolder } from "@gooi/tasks/file";
import { tasksTable } from "@gooi/tasks/table";
import { markdownTable, work, type Answer } from "./index.js";

const dir = mkdtempSync(join(tmpdir(), "gooi-work-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
writeFileSync(join(dir, "ship-room.md"), "---\nstatus: open\ncreated: 2026-11-03\n---\n\n# Ship the room page\n");
writeFileSync(join(dir, "fix-paste.md"), "---\nstatus: done\ncreated: 2026-11-01\nfinished: 2026-11-02\n---\n\n# Fix | rich paste\n");

const requests: URL[] = [];
const github = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  requests.push(url);
  const all = [
    { number: 7, title: "Tables lose columns", state: "open", user: { login: "nic" }, labels: [{ name: "bug" }], assignees: [],
      comments: 1, created_at: "2026-11-04T09:00:00Z", updated_at: "2026-11-04T09:00:00Z", closed_at: null,
      html_url: "https://github.com/o/r/issues/7" },
    { number: 6, title: "javascript:alert(1)", state: "closed", user: { login: "nic" }, labels: [], assignees: [],
      comments: 0, created_at: "2026-10-30T09:00:00Z", updated_at: "2026-10-31T09:00:00Z", closed_at: "2026-10-31T09:00:00Z",
      html_url: "javascript:alert(1)" },
  ];
  const state = url.searchParams.get("state");
  return Response.json(all.filter((issue) => state === "all" || issue.state === state));
}) as unknown as typeof fetch;

const listing = tasksApp(fileFolder(dir));
const app = work({
  engine: duckdb(),
  tasks: path(listing.tasks, tasksTable),
  issues: issues({ repo: "o/r", fetch: github, baseUrl: "https://api.github.test" }),
  project: "gooi",
});
const run = async (edge: Implementation, value: object = {}) =>
  (await invoke(edge, artifact(edge.operation.input, value as never))).artifact.value as unknown;

test("all work: tasks and issues from one query, open first, newest first", async () => {
  const answer = await run(app.all) as Answer;
  expect(answer.data.map((row) => [row.kind, row.ref, row.status])).toEqual([
    ["issue", "#7", "open"], ["task", "ship-room", "open"], ["task", "fix-paste", "done"], ["issue", "#6", "closed"],
  ]);
  expect(answer.pushdown).toEqual({ issues: { filters: [], rows: 2 } });
  expect(requests.at(-1)!.searchParams.get("state")).toBe("all");
});

test("open work asks GitHub for open issues only", async () => {
  const answer = await run(app.open) as Answer;
  expect(answer.data.map((row) => row.ref)).toEqual(["#7", "ship-room"]);
  expect(answer.pushdown.issues).toEqual({ filters: [{ column: "state", op: "=", value: "open" }], rows: 1 });
  expect(requests.at(-1)!.searchParams.get("state")).toBe("open");
});

test("any SELECT can join tasks and issues; other statements are refused", async () => {
  const answer = await run(app.query, {
    sql: "SELECT t.name, i.number FROM tasks t JOIN issues i ON i.created_at::DATE >= t.created WHERE t.status = 'open'",
  }) as Answer;
  expect(answer.data).toEqual([{ name: "ship-room", number: 7 }]);
  await expect(run(app.query, { sql: "DROP TABLE tasks" })).rejects.toThrow("Only one SELECT can be queried");
});

test("Markdown has one separator cell per column, and cells can't break the table", async () => {
  const text = await run(path(app.all, app.markdown)) as string;
  const [header, separator, ...rows] = text.split("\n");
  expect(header).toBe("| kind | ref | title | status | created | closed | url |");
  expect(separator).toBe("| --- | --- | --- | --- | --- | --- | --- |");
  expect(rows.find((row) => row.includes("fix-paste"))).toContain("Fix \\| rich paste");
  expect(markdownTable({ type: "table", schema: { fields: [] }, data: [] })).toBe("");
});

test("the page shows values as text and links only http(s) URLs", async () => {
  const html = await run(path(app.all, app.html, printHtml)) as string;
  expect(html).toContain("<title>gooi: work</title>");
  expect(html).toContain('<a href="https://github.com/o/r/issues/7">open</a>');
  expect(html).not.toContain('href="javascript:');
  expect(html).toContain("<td>javascript:alert(1)</td>");
  expect(html).toContain("issues: 2 fetched");
});
