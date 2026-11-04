import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const server = fileURLToPath(new URL("./mcp.ts", import.meta.url));
let root: string;
let mcp: Client;
beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "gooi-mcp-"));
  const env = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)) as Record<string, string>;
  mcp = new Client({ name: "gooi-test", version: "0.0.0" });
  await mcp.connect(new StdioClientTransport({ command: process.execPath, args: [server], env: { ...env, GOOI_ROOT: root } }));
});
afterEach(async () => {
  await mcp.close();
  rmSync(root, { recursive: true, force: true });
});

const text = (result: { content?: unknown }) => (result.content as { text: string }[])[0]!.text;

test("gooi's MCP server offers its commands an agent may use, and not the owner's", async () => {
  const names = (await mcp.listTools()).tools.map((tool) => tool.name).sort();
  expect(names).toEqual([
    "agent_sessions", "agent_show", "room_replay", "room_show", "slice_status",
    "task_add", "task_finish", "task_list",
  ]);
});

test("an MCP client tracks gooi's tasks through the same edges as the CLI", async () => {
  const added = await mcp.callTool({ name: "task_add", arguments: { title: "Track this over MCP" } });
  expect(added.isError, text(added)).toBeFalsy();
  expect(existsSync(join(root, "tasks", "track-this-over-mcp.md"))).toBe(true);
  const listed = JSON.parse(text(await mcp.callTool({ name: "task_list", arguments: {} })));
  expect(listed.open.map((task: { title: string }) => task.title)).toEqual(["Track this over MCP"]);
  await mcp.callTool({ name: "task_finish", arguments: { name: "track-this" } });
  expect(JSON.parse(text(await mcp.callTool({ name: "task_list", arguments: {} }))).done).toHaveLength(1);
  const refused = await mcp.callTool({ name: "task_add", arguments: {} });
  expect(refused).toMatchObject({ isError: true });
  expect(text(refused)).toContain("title");
  expect(JSON.parse(text(await mcp.callTool({ name: "slice_status", arguments: {} })))).toEqual({
    open: null, waiting: [], done: [],
  });
});
