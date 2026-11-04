import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { target } from "./compile.js";

const cli = fileURLToPath(target);
let root: string;
let github: ReturnType<typeof Bun.serve>;
const asked: URLSearchParams[] = [];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "nooq-work-"));
  mkdirSync(join(root, "tasks"));
  writeFileSync(join(root, "tasks", "ship-room.md"), "---\nstatus: open\ncreated: 2026-11-03\n---\n\n# Ship the room page\n");
  github = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      asked.push(url.searchParams);
      expect(url.pathname).toBe("/repos/o/r/issues");
      return Response.json([{
        number: 4, title: "Tables lose columns", state: "open", user: { login: "nic" }, labels: [], assignees: [], comments: 0,
        created_at: "2026-11-04T00:00:00Z", updated_at: "2026-11-04T00:00:00Z", closed_at: null, html_url: "https://github.com/o/r/issues/4",
      }]);
    },
  });
});
afterEach(() => {
  github.stop(true);
  rmSync(root, { recursive: true, force: true });
});

// Async, so the fake GitHub server in this process can answer while the CLI runs.
const nooq = async (...args: string[]) => {
  const proc = Bun.spawn([process.execPath, cli, ...args], {
    env: { ...process.env, NOOQ_ROOT: root, NOOQ_REPO: "o/r", GITHUB_API_URL: github.url.origin },
    stdout: "pipe", stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { code, out, err };
};

test("work open: one query over nooq's tasks and its GitHub issues, with state pushed to GitHub", async () => {
  const open = await nooq("work", "open");
  expect(open.code, open.err).toBe(0);
  expect(open.out).toBe([
    "| kind | ref | title | created | url |",
    "| --- | --- | --- | --- | --- |",
    "| issue | #4 | Tables lose columns | 2026-11-04 | https://github.com/o/r/issues/4 |",
    "| task | ship-room | Ship the room page | 2026-11-03 |  |",
    "",
  ].join("\n"));
  expect(asked.at(-1)!.get("state")).toBe("open");

  const joined = await nooq("work", "query", "--sql", "SELECT count(*) AS n FROM tasks, issues WHERE issues.created_at::DATE > tasks.created");
  expect(joined.code, joined.err).toBe(0);
  expect(joined.out).toBe("| n |\n| --- |\n| 1 |\n");
  expect(asked.at(-1)!.get("state")).toBe("all");
});
