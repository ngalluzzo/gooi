import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agent, type Model } from "@gooi/agent";
import { edge, invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { jsonl } from "@gooi/jsonl";
import { LOG_APPEND, LOG_READ, LogConflict, type Log } from "@gooi/log";
import { jsonlLog } from "@gooi/log/jsonl";
import { sqliteLog } from "@gooi/log/sqlite";
import { sqlite } from "@gooi/sqlite";
import { ROOM_SAY, ROOM_SHOW, rooms } from "./index.js";
import { message, type RoomEvent } from "./matrix.js";

const dirs: string[] = [];
afterAll(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "gooi-room-"));
  dirs.push(dir);
  return dir;
};
const stores = {
  jsonl: () => jsonlLog(jsonl(temp())),
  sqlite: () => sqliteLog(sqlite(join(temp(), "rooms.sqlite"))),
};

/** A model that answers with fixed text and remembers every prompt it saw. */
function fake(reply: string | (() => never)) {
  const prompts: string[] = [];
  const model: Model = {
    start: () => ({
      async send(text) {
        prompts.push(text);
        if (typeof reply === "function") reply();
        return { text: reply as string, toolCalls: [], stop: "end_turn" };
      },
      answer: async () => ({ text: "", toolCalls: [], stop: "end_turn" }),
    }),
  };
  return { prompts, agent: agent({ instructions: "test", tools: {}, model }) };
}

const OWNER = "@nic:localhost";
const setup = (log: Log, replies: Record<string, string | (() => never)>, maxReplies?: number) => {
  const agents = Object.fromEntries(Object.entries(replies).map(([name, reply]) => [name, fake(reply)]));
  const room = rooms({
    log,
    owner: OWNER,
    agents: Object.fromEntries(Object.entries(agents).map(([name, { agent }]) => [name, agent])),
    ...(maxReplies === undefined ? {} : { maxReplies }),
  });
  const say = async (text: string, name = "gooi") =>
    (await invoke(room.say, artifact(ROOM_SAY, { room: name, text }))).artifact.value as string;
  const show = async (name = "gooi") =>
    (await invoke(room.show, artifact(ROOM_SHOW, { room: name }))).artifact.value as string;
  return { agents, room, say, show };
};

for (const [store, open] of Object.entries(stores)) {
  describe(store, () => {
    test("a new room joins everyone, and the mentioned agent answers under its own ID", async () => {
      const log = open();
      const { agents, say, show } = setup(log, { claude: "Ship the room first.", omlx: "unused" });
      const said = await say("@claude what's next?");
      expect(said).toBe([
        "* nic joined",
        "* claude joined",
        "* omlx joined",
        "nic: @claude what's next?",
        "claude: Ship the room first.",
      ].join("\n"));
      expect(await show()).toBe(said);
      expect(agents.omlx!.prompts).toEqual([]);

      const events = (await invoke(log.read, artifact(LOG_READ, { stream: "gooi" })))
        .artifact.value as unknown as RoomEvent[];
      const [, , , asked, answered] = events;
      expect(asked).toMatchObject({
        type: "m.room.message",
        sender: OWNER,
        room_id: "!gooi:localhost",
        content: { msgtype: "m.text", "m.mentions": { user_ids: ["@claude:localhost"] } },
      });
      expect(answered).toMatchObject({ sender: "@claude:localhost", content: { body: "Ship the room first." } });
      expect(events[0]).toMatchObject({ type: "m.room.member", state_key: OWNER, content: { membership: "join" } });
    });
  });
}

test("mentioned agents answer once each, in mention order, seeing earlier replies", async () => {
  const { agents, say } = setup(stores.jsonl(), { claude: "Agreed with omlx.", omlx: "Rooms first." });
  expect(await say("@omlx and @claude.: thoughts?")).toEndWith("omlx: Rooms first.\nclaude: Agreed with omlx.");
  expect(agents.omlx!.prompts).toHaveLength(1);
  expect(agents.claude!.prompts).toHaveLength(1);
  expect(agents.claude!.prompts[0]).toContain("omlx: Rooms first.");
  expect(agents.claude!.prompts[0]).toContain("You are claude (@claude:localhost)");
});

test("@room mentions every agent; no mention starts no turn", async () => {
  const { agents, say } = setup(stores.jsonl(), { claude: "c", omlx: "o" });
  expect(await say("just a note")).toEndWith("nic: just a note");
  expect(await say("@room hello")).toEndWith("nic: @room hello\nclaude: c\nomlx: o");
  expect([agents.claude!.prompts.length, agents.omlx!.prompts.length]).toEqual([1, 1]);
});

test("agents bring each other in by mention, and the conversation ends when no one is asked", async () => {
  const log = stores.jsonl();
  const { agents, say } = setup(log, { claude: "Over to you, @omlx.", omlx: "Agreed, @nic." });
  expect(await say("@claude go")).toEndWith("nic: @claude go\nclaude: Over to you, @omlx.\nomlx: Agreed, @nic.");
  expect(agents.omlx!.prompts[0]).toContain("claude: Over to you, @omlx.");
  expect(agents.omlx!.prompts[0]).toContain("Also here: nic (the owner), @claude.");
  const events = (await invoke(log.read, artifact(LOG_READ, { stream: "gooi" })))
    .artifact.value as unknown as RoomEvent[];
  expect(events.at(-2)).toMatchObject({ content: { "m.mentions": { user_ids: ["@omlx:localhost"] } } });
  // Mentioning the owner records the mention; people are never called.
  expect(events.at(-1)).toMatchObject({ content: { "m.mentions": { user_ids: ["@nic:localhost"] } } });
});

test("an agent already waiting to answer isn't asked twice", async () => {
  const { agents, say } = setup(stores.jsonl(), { claude: "Good question for @omlx.", omlx: "Here's my take." });
  expect(await say("@claude ask @omlx about rooms")).toEndWith(
    "claude: Good question for @omlx.\nomlx: Here's my take.",
  );
  expect(agents.omlx!.prompts).toHaveLength(1);
  expect(agents.omlx!.prompts[0]).toContain("claude: Good question for @omlx.");
});

test("agents that keep mentioning each other stop at the reply limit, and the last one knows it", async () => {
  const { agents, say } = setup(stores.jsonl(), { claude: "What about you, @omlx?", omlx: "And you, @claude?" }, 3);
  const said = await say("@claude start");
  expect(said.split("\n").slice(-3)).toEqual([
    "claude: What about you, @omlx?",
    "omlx: And you, @claude?",
    "claude: What about you, @omlx?",
  ]);
  expect([agents.claude!.prompts.length, agents.omlx!.prompts.length]).toEqual([2, 1]);
  expect(agents.claude!.prompts[0]).toContain("2 more agent replies can follow yours");
  expect(agents.claude!.prompts[1]).toContain("Yours is the last agent reply before the owner speaks again");
});

test("an agent never answers its own mention", async () => {
  const { agents, say } = setup(stores.jsonl(), { claude: "Noted by me, @claude." });
  await say("@claude note this");
  expect(agents.claude!.prompts).toHaveLength(1);
});

test("an agent that fails leaves a note, and the others still answer", async () => {
  const { say } = setup(stores.jsonl(), {
    claude: () => { throw new Error("connection refused"); },
    omlx: "still here",
  });
  expect(await say("@claude @omlx ping")).toEndWith(
    "claude: (couldn't answer: connection refused)\nomlx: still here",
  );
});

test("a message still lands when another writer gets there first", async () => {
  const log = stores.jsonl();
  let raced = false;
  const racing: Log = {
    ...log,
    append: edge({ operation: log.append.operation, claim: { id: "urn:test:raced", version: 1 }, scope: "Raced" },
      async (input) => {
        if (!raced) {
          raced = true;
          await invoke(log.append, artifact(LOG_APPEND, {
            stream: "gooi", expectedLength: 0, entries: [message("gooi", "@claude:localhost", "first")],
          }));
          throw new LogConflict("gooi", 0, 1);
        }
        return (await invoke(log.append, input)).artifact.value;
      }),
  };
  const { say, show } = setup(racing, { claude: "c" });
  await say("hello");
  expect(await show()).toBe("claude: first\nnic: hello");
});

test("show refuses a room that doesn't exist", async () => {
  const { show } = setup(stores.jsonl(), {});
  await expect(show("nowhere")).rejects.toThrow("No room named nowhere");
});

test("events that don't match Matrix's schemas are refused", async () => {
  const log = stores.jsonl();
  const { say, show } = setup(log, {});
  await expect(say("x", "Gooi!")).rejects.toThrow("must match pattern");
  const bad = { ...message("gooi", OWNER, "hi"), content: { msgtype: "m.text", body: 7 } };
  await invoke(log.append, artifact(LOG_APPEND, { stream: "gooi", expectedLength: 0, entries: [bad] }));
  await expect(show()).rejects.toThrow("chunk.0.content.body must be string");
});

test("a room refuses a log or an agent that doesn't have the contracts it calls", () => {
  const log = stores.jsonl();
  const { agent: claude } = fake("c");
  expect(() => rooms({ log: { ...log, read: log.list }, owner: OWNER, agents: { claude } })).toThrow(
    "The room log's read must take urn:gooi:log:read@1 and give urn:gooi:log:entries@1, but takes urn:gooi:log:list@1",
  );
  expect(() => rooms({ log, owner: OWNER, agents: { claude, tasks: log.list } })).toThrow(
    "Agent tasks must take https://agentclientprotocol.com/protocol/v1/schema#PromptRequest@1",
  );
});
