import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeBlock, newBlockId } from "@nooq/core";
import { invoke, type Implementation } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { jsonl } from "@gooi/jsonl";
import { LOG_APPEND, LOG_READ, type Log } from "@gooi/log";
import { jsonlLog } from "@gooi/log/jsonl";
import { sqliteLog } from "@gooi/log/sqlite";
import { sqlite } from "@gooi/sqlite";
import { documents } from "./index.js";

const dirs: string[] = [];
afterAll(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "gooi-nooq-docs-"));
  dirs.push(dir);
  return dir;
};
const stores = {
  jsonl: () => jsonlLog(jsonl(temp())),
  sqlite: () => sqliteLog(sqlite(join(temp(), "docs.sqlite"))),
};

const OWNER = { actorId: "human:nic", kind: "human" as const };
const NOTES = "# Notes\n\nShip the room page first.\n\nThen push live updates.\n";

function setup(log: Log = stores.jsonl()) {
  const root = temp();
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "docs", "notes.md"), NOTES);
  const docs = documents({ log, owner: OWNER, root });
  const run = async <T = unknown>(edge: Implementation, value: object) =>
    (await invoke(edge, artifact(edge.operation.input, value as never))).artifact.value as T;
  const blocks = () => run<{ id: string; type: string; text?: string }[]>(docs.blocks, { name: "notes" });
  const block = async (starts: string) => (await blocks()).find((b) => b.text?.startsWith(starts))!;
  const propose = async (starts: string, text: string, agent = "claude-code") => {
    const target = await block(starts);
    return (await run<{ suggestion: string }>(docs.propose, { name: "notes", block: target.id, text, agent })).suggestion;
  };
  const markdown = () => run<string>(docs.markdown, { name: "notes" });
  return { docs, run, blocks, block, propose, markdown, log, root };
}

for (const [store, open] of Object.entries(stores)) {
  describe(store, () => {
    test("a Markdown file comes in through nooq's import and reads back through its export", async () => {
      const { docs, run, markdown } = setup(open());
      expect(await run(docs.import, { name: "notes", path: "docs/notes.md" })).toEqual({ name: "notes", blocks: 3 });
      expect(await markdown()).toBe("# Notes\n\nShip the room page first.\n\nThen push live updates.");
      expect(await run(docs.list, {})).toMatchObject([{ name: "notes", changes: 1 }]);
    });
  });
}

test("an agent's suggestion leaves the document alone until the owner accepts it", async () => {
  const { docs, run, propose, markdown, log } = setup();
  await run(docs.import, { name: "notes", path: "docs/notes.md" });
  const suggestion = await propose("Ship", "Ship the room page this week.");
  expect(await markdown()).toContain("Ship the room page first.");
  expect(await run(docs.suggestions, { name: "notes" })).toEqual([{
    id: suggestion,
    proposer: "ai:claude-code",
    status: "fresh",
    changes: [{ block: expect.any(String), before: "Ship the room page first.", after: "Ship the room page this week." }],
  }]);

  await run(docs.accept, { name: "notes", suggestion });
  expect(await markdown()).toContain("Ship the room page this week.");
  expect(await run(docs.suggestions, { name: "notes" })).toEqual([]);

  // nooq's adoption: the proposer authors the change, and the owner adopted it.
  const entries = (await invoke(log.read, artifact(LOG_READ, { stream: "notes" }))).artifact.value as unknown as {
    tx: { actor: { actorId: string }; adoptedBy?: string; intent?: string };
  }[];
  expect(entries.at(-1)!.tx).toMatchObject({ actor: { actorId: "ai:claude-code" }, adoptedBy: "human:nic" });
});

test("a suggestion made stale by another change is refused unless forced, as nooq decides", async () => {
  const { docs, run, propose, markdown } = setup();
  await run(docs.import, { name: "notes", path: "docs/notes.md" });
  const late = await propose("Ship", "Ship the room page first!");
  await run(docs.accept, { name: "notes", suggestion: await propose("Ship", "Skip the room page first.", "omlx") });
  const pending = await run<{ id: string; status: string }[]>(docs.suggestions, { name: "notes" });
  expect(pending).toMatchObject([{ id: late, status: "stale" }]);
  await expect(run(docs.accept, { name: "notes", suggestion: late })).rejects.toThrow("suggestion is stale, not fresh");

  // Forcing applies the proposal's exact edit to the text as it is now.
  await run(docs.accept, { name: "notes", suggestion: late, force: "yes" });
  expect(await markdown()).toContain("Skip the room page first!");
});

test("a rejected suggestion is removed and changes nothing", async () => {
  const { docs, run, propose, markdown } = setup();
  await run(docs.import, { name: "notes", path: "docs/notes.md" });
  const suggestion = await propose("Then", "Then skip live updates.");
  await run(docs.reject, { name: "notes", suggestion });
  expect(await markdown()).toContain("Then push live updates.");
  expect(await run(docs.suggestions, { name: "notes" })).toEqual([]);
  await expect(run(docs.accept, { name: "notes", suggestion })).rejects.toThrow(`Document notes has no pending suggestion ${suggestion}`);
});

test("imports stay inside the document folder and never overwrite a document", async () => {
  const { docs, run } = setup();
  await expect(run(docs.import, { name: "notes", path: "../outside.md" })).rejects.toThrow("../outside.md is outside the document folder");
  await run(docs.import, { name: "notes", path: "docs/notes.md" });
  await expect(run(docs.import, { name: "notes", path: "docs/notes.md" })).rejects.toThrow("Document notes already exists");
  await expect(run(docs.markdown, { name: "missing" })).rejects.toThrow("No document named missing");
});

test("proposals name a real block with text and actually change it", async () => {
  const { docs, run, block } = setup();
  await run(docs.import, { name: "notes", path: "docs/notes.md" });
  const propose = (target: string, text: string) => run(docs.propose, { name: "notes", block: target, text, agent: "a" });
  await expect(propose("nope", "x")).rejects.toThrow("Document notes has no block nope");
  await expect(propose((await block("Ship")).id, "Ship the room page first.")).rejects.toThrow("same as the block's current text");
});

test("a stored state that doesn't match its history is refused when the document opens", async () => {
  const { docs, run, log, markdown } = setup();
  await run(docs.import, { name: "notes", path: "docs/notes.md" });
  const [entry] = (await invoke(log.read, artifact(LOG_READ, { stream: "notes" }))).artifact.value as unknown as {
    tx: { lamport: number }; state: unknown;
  }[];
  // A real change whose stored state was left behind.
  const tx = {
    id: newBlockId(), actor: OWNER, lamport: 2, causality: {}, intent: "add",
    ops: [{ op: "insert", block: makeBlock({ type: "nooq.paragraph/v1", text: { s: "Added", marks: [[], [], [], [], []] } }, OWNER.actorId), parent: null }],
  };
  await invoke(log.append, artifact(LOG_APPEND, { stream: "notes", expectedLength: 1, entries: [{ tx, state: entry!.state }] } as never));
  await expect(markdown()).rejects.toThrow("Document notes's stored state doesn't match its history");
});

test("HTML goes through mdast and hast, and raw HTML in the Markdown stays text", async () => {
  const root = temp();
  writeFileSync(join(root, "page.md"), "# Title\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n<script>alert(1)</script>\n");
  const docs = documents({ log: stores.jsonl(), owner: OWNER, root });
  await invoke(docs.import, artifact(docs.import.operation.input, { name: "page", path: "page.md" }));
  const html = (await invoke(docs.html, artifact(docs.html.operation.input, { name: "page" }))).artifact.value as string;
  expect(html).toStartWith('<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><h1>Title</h1>');
  expect(html).toContain("<table>");
  expect(html).not.toContain("<script>");
});
