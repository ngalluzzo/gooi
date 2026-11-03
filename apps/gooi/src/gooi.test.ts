import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parsesTo } from "@gooi/estree";
import {
  designTarget,
  generate,
  generateDesign,
  generateServer,
  serverTarget,
  target,
} from "./compile.js";

const cli = fileURLToPath(target);
const source = readFileSync(cli, "utf8");
const server = fileURLToPath(serverTarget);

describe("generated gooi.ts, shadcn.tsx and server.ts", () => {
  test("are the programs the current layouts lower to", async () => {
    // Compares syntax trees, so formatting is free; changing commands.ts,
    // design.ts or routes.ts without `bun run compile` is not.
    expect(parsesTo(source, (await generate()).program.value as never)).toBe(true);
    const design = (await generateDesign()).program.value as never;
    expect(parsesTo(readFileSync(designTarget, "utf8"), design, "tsx")).toBe(true);
    const routes = (await generateServer()).program.value as never;
    expect(parsesTo(readFileSync(server, "utf8"), routes)).toBe(true);
  });

  test("doesn't use gooi's generic CLI", () => {
    expect(source).not.toContain("@gooi/cli");
    const manifest = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    expect(manifest).not.toContain("@gooi/cli");
  });
});

describe("gooi end to end", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "gooi-root-"));
    writeFileSync(
      join(root, "AGENTS.md"),
      "# Page\n\n<!-- gooi:slices:start -->\n<!-- gooi:slices:end -->\n",
    );
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function gooi(...args: string[]) {
    const run = Bun.spawnSync(["bun", cli, ...args], {
      env: { ...process.env, GOOI_ROOT: root },
    });
    const out = run.stdout.toString(),
      err = run.stderr.toString();
    return { code: run.exitCode, out, err, json: () => JSON.parse(out) };
  }

  test("slices and tasks through the compiled commands", () => {
    expect(gooi("slice", "status").json()).toEqual({ open: null, done: [] });
    expect(gooi("slice", "open", "--title", "Try it", "--done", "used").json().open).toEqual({
      number: 1,
      title: "Try it",
      done: "used",
    });
    const again = gooi("slice", "open", "--title", "Two", "--done", "x");
    expect(again.code).toBe(1);
    expect(again.err).toContain("Slice 1 is still open");

    expect(gooi("task", "add", "--title", "First task", "--notes", "Why.").json()).toMatchObject({
      name: "first-task",
      status: "open",
    });
    expect(readFileSync(join(root, "tasks", "first-task.md"), "utf8")).toContain("# First task\n\nWhy.\n");
    expect(gooi("task", "finish", "--name", "first").json()).toMatchObject({ status: "done" });
    expect(gooi("task", "list").json().done[0].name).toBe("first-task");

    gooi("slice", "close", "--used", "the end-to-end test");
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).toContain(
      "- **1. Try it** (closed",
    );
  });

  test("the task page shows CLI changes, hand edits and broken files", async () => {
    const port = 40000 + Math.floor(Math.random() * 20000);
    const page = `http://localhost:${port}/`;
    const proc = Bun.spawn(["bun", server], {
      env: { ...process.env, GOOI_ROOT: root, PORT: String(port) },
      stdout: "ignore",
      stderr: "ignore",
    });
    try {
      let first: Response | undefined;
      for (let i = 0; i < 100 && !first; i++)
        first = await fetch(page).catch(() => Bun.sleep(50).then(() => undefined));
      expect(first?.status).toBe(200);
      expect(first?.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await first!.text()).toContain("Nothing open.");

      gooi("task", "add", "--title", "<b>Bold</b> plan");
      expect(await (await fetch(page)).text()).toContain("&#x3C;b>Bold&#x3C;/b> plan");

      // The same view through the shadcn mapping: components, same text.
      const designed = await fetch(`${page}shadcn`);
      expect(designed.headers.get("content-type")).toBe("text/html; charset=utf-8");
      const html = await designed.text();
      expect(html).toContain('data-slot="card"');
      expect(html).toContain('data-slot="badge"');
      expect(html).toContain('<link rel="stylesheet" href="/shadcn.css"/>');
      expect(html).toContain("&lt;b&gt;Bold&lt;/b&gt; plan");
      expect(html).not.toContain("<b>Bold</b>");
      const styles = await fetch(`${page}shadcn.css`);
      expect(styles.headers.get("content-type")).toBe("text/css; charset=utf-8");
      expect(await styles.text()).toContain(".bg-card");

      const file = join(root, "tasks", "b-bold-b-plan.md");
      writeFileSync(file, readFileSync(file, "utf8").replace("# <b>Bold</b> plan", "# Renamed by hand"));
      writeFileSync(join(root, "tasks", "broken.md"), "no header\n");
      const after = await (await fetch(page)).text();
      expect(after).toContain("Renamed by hand");
      expect(after).toContain("broken.md");
      expect(after).toContain("Expected the file to start with a --- header");

      const bad = await fetch(`${page}?x=1`);
      expect(bad.status).toBe(400);
      expect(await bad.text()).toBe("Unexpected field: x");
    } finally {
      proc.kill();
      await proc.exited;
    }
  });

  for (const store of ["jsonl", "sqlite", "drizzle"] as const) {
    test(`agent tell persists and agent show replays ACP notifications using ${store}`, async () => {
      async function runAgent(using: string, ...args: string[]) {
        const proc = Bun.spawn([process.execPath, cli, "agent", ...args], {
          env: {
            ...process.env,
            GOOI_ROOT: root,
            GOOI_STORE: using,
            GOOI_AGENT: "omlx",
            OMLX_BASE_URL: new URL("/v1", provider.url).href,
            OMLX_API_KEY: "test",
          },
          stdout: "pipe",
          stderr: "pipe",
        });
        const [out, err, code] = await Promise.all([
          new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
        ]);
        return { out, err, code };
      }

      const agentCommand = (...args: string[]) => runAgent(store, ...args);
      const observed: string[] = [];
      const provider = Bun.serve({
        port: 0,
        async fetch(request) {
          const { messages } = await request.json() as { messages: { role: string }[] };
          const beforeTool = messages.at(-1)?.role === "user";
          // This request is still in flight. The CLI can already replay the prompt
          // and, on the second request, the tool call and its result.
          const list = await agentCommand("sessions");
          const session = JSON.parse(list.out).sessions[0].sessionId;
          const show = await agentCommand("show", "--session", session);
          observed.push(show.out);
          return Response.json({
            choices: [beforeTool
              ? {
                  finish_reason: "tool_calls",
                  message: {
                    role: "assistant", content: null,
                    tool_calls: [{ id: "call-1", type: "function", function: { name: "list_tasks", arguments: "{}" } }],
                  },
                }
              : { finish_reason: "stop", message: { role: "assistant", content: "I checked the tasks." } }],
          });
        },
      });

      try {
        const tell = await agentCommand("tell", "--text", "Check the tasks");
        expect(tell.code, tell.err).toBe(0);
        expect(JSON.parse(tell.out).response.stopReason).toBe("end_turn");
        expect(observed).toEqual([
          "You: Check the tasks\n",
          "You: Check the tasks\nTool: list_tasks\nTool: list_tasks (completed)\n",
        ]);

        const list = await agentCommand("sessions");
        expect(list.code, list.err).toBe(0);
        const { sessions } = JSON.parse(list.out);
        expect(sessions).toHaveLength(1);
        expect(sessions[0]).toMatchObject({ cwd: root, updatedAt: expect.any(String) });
        const show = await agentCommand("show", "--session", sessions[0].sessionId);
        expect(show.code, show.err).toBe(0);
        expect(show.out).toBe(observed[1] + "Agent: I checked the tasks.\n");
        if (store !== "jsonl") {
          const other = store === "sqlite" ? "drizzle" : "sqlite";
          const replay = await runAgent(other, "show", "--session", sessions[0].sessionId);
          expect(replay.code, replay.err).toBe(0);
          expect(replay.out).toBe(show.out);
        }
        const missing = await agentCommand("show", "--session", "missing");
        expect(missing.code).toBe(1);
        expect(missing.err).toContain("No saved agent session missing");
      } finally {
        provider.stop(true);
      }
    });
  }

  test("refusals exit nonzero with a readable message", () => {
    const missing = gooi("task", "add");
    expect(missing.code).not.toBe(0);
    expect(missing.err).toContain("required option '--title <title>' not specified");
    const unknown = gooi("task", "finish", "--name", "nope");
    expect(unknown.code).toBe(1);
    expect(unknown.err).toContain("No task named nope");
    const blank = gooi("task", "add", "--title", "   ");
    expect(blank.code).toBe(1);
    expect(blank.err).toContain("Expected title as one line that is not blank");
  });
});
