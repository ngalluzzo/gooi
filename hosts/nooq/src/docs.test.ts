import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { target } from "./compile.js";

const cli = fileURLToPath(target);
const server = fileURLToPath(new URL("./mcp.ts", import.meta.url));
let root: string;
let mcp: Client;
const env = () => ({
  ...(Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)) as Record<string, string>),
  NOOQ_ROOT: root,
});

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "nooq-docs-root-"));
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "docs", "plan.md"), "# Plan\n\nShip the room page first.\n");
  mcp = new Client({ name: "nooq-docs-test", version: "0.0.0" });
  await mcp.connect(new StdioClientTransport({ command: process.execPath, args: [server], env: env() }));
});
afterEach(async () => {
  await mcp.close();
  rmSync(root, { recursive: true, force: true });
});

function nooq(...args: string[]) {
  const run = Bun.spawnSync([process.execPath, cli, ...args], { env: env() });
  return { code: run.exitCode, out: run.stdout.toString(), err: run.stderr.toString() };
}
const text = (result: { content?: unknown }) => (result.content as { text: string }[])[0]!.text;

test("an agent proposes over MCP and the owner accepts on nooq's CLI", async () => {
  expect(nooq("doc", "import", "--name", "plan", "--path", "docs/plan.md").code).toBe(0);

  const tools = (await mcp.listTools()).tools.filter((tool) => tool.name.startsWith("doc_"));
  expect(tools.map((tool) => tool.name).sort()).toEqual(["doc_blocks", "doc_list", "doc_propose", "doc_read", "doc_suggestions"]);
  const blocks = JSON.parse(text(await mcp.callTool({ name: "doc_blocks", arguments: { name: "plan" } })));
  const line = blocks.find((block: { text?: string }) => block.text === "Ship the room page first.");
  const proposed = await mcp.callTool({
    name: "doc_propose",
    arguments: { name: "plan", block: line.id, text: "Ship the room page this week.", agent: "claude-code", intent: "set a date" },
  });
  expect(proposed.isError, text(proposed)).toBeFalsy();
  const { suggestion } = JSON.parse(text(proposed));

  const pending = JSON.parse(nooq("doc", "suggestions", "--name", "plan").out);
  expect(pending).toMatchObject([{ id: suggestion, proposer: "ai:claude-code", intent: "set a date", status: "fresh" }]);
  expect(nooq("doc", "read", "--name", "plan").out).toBe("# Plan\n\nShip the room page first.\n");
  const accepted = nooq("doc", "accept", "--name", "plan", "--suggestion", suggestion);
  expect(accepted.code, accepted.err).toBe(0);
  expect(text(await mcp.callTool({ name: "doc_read", arguments: { name: "plan" } }))).toBe("# Plan\n\nShip the room page this week.");
  expect(nooq("doc", "html", "--name", "plan").out).toContain("<p>Ship the room page this week.</p>");
});
