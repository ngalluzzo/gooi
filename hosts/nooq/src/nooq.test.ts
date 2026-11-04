import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parsesTo } from "@gooi/estree";
import { localUser } from "@gooi/host-kit";
import { generate, target } from "./compile.js";

const cli = fileURLToPath(target);

test("nooq.ts is the program the current layout lowers to", async () => {
  expect(parsesTo(readFileSync(cli, "utf8"), (await generate()).program.value as never)).toBe(true);
});

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "nooq-root-")); });
afterEach(() => rmSync(root, { recursive: true, force: true }));

async function nooq(env: Record<string, string>, ...args: string[]) {
  const proc = Bun.spawn([process.execPath, cli, ...args], {
    env: { ...process.env, NOOQ_ROOT: root, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
  ]);
  return { out, err, code };
}

test("the same apps, purposed to nooq: its tasks, and a room whose agents use them", async () => {
  // A fake OpenAI-compatible server: first the agent lists nooq's tasks, then it answers.
  const provider = Bun.serve({
    port: 0,
    async fetch(request) {
      const { messages } = await request.json() as { messages: { role: string }[] };
      const listed = messages.at(-1)?.role === "tool";
      return Response.json({
        choices: [listed
          ? { finish_reason: "stop", message: { role: "assistant", content: "nooq has one open task." } }
          : {
              finish_reason: "tool_calls",
              message: {
                role: "assistant", content: null,
                tool_calls: [{ id: "call-1", type: "function", function: { name: "list_tasks", arguments: "{}" } }],
              },
            }],
      });
    },
  });
  const env = { OMLX_BASE_URL: new URL("/v1", provider.url).href, OMLX_API_KEY: "test" };
  try {
    const added = await nooq(env, "task", "add", "--title", "Ship the history layers");
    expect(added.code, added.err).toBe(0);
    expect(existsSync(join(root, "tasks", "ship-the-history-layers.md"))).toBe(true);
    expect(JSON.parse((await nooq(env, "task", "list")).out).open).toHaveLength(1);

    const said = await nooq(env, "room", "say", "--room", "work", "--text", "@omlx what's open?");
    expect(said.code, said.err).toBe(0);
    const me = localUser();
    expect(said.out).toBe(
      `* ${me} joined\n* claude joined\n* omlx joined\n${me}: @omlx what's open?\nomlx: nooq has one open task.\n`,
    );
    expect((await nooq(env, "room", "show", "--room", "work")).out).toBe(said.out);
    // The room and the agent's session are nooq's, under its own .gooi.
    expect(existsSync(join(root, ".gooi", "rooms"))).toBe(true);
    expect(existsSync(join(root, ".gooi", "agent-sessions"))).toBe(true);
  } finally {
    provider.stop(true);
  }
});

test("gooi's own commands aren't part of nooq's", async () => {
  const help = await nooq({}, "--help");
  expect(help.out).toContain("task");
  expect(help.out).toContain("room");
  expect(help.out).not.toContain("slice");
  expect(help.out).not.toContain("agent tell");
});
