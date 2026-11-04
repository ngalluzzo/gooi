import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Model, ToolCall } from "@gooi/agent";
import { edge, invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { jsonl } from "@gooi/jsonl";
import { LOG_APPEND, LOG_READ, LogConflict, type Log } from "@gooi/log";
import { jsonlLog } from "@gooi/log/jsonl";
import { sqliteLog } from "@gooi/log/sqlite";
import { sqlite } from "@gooi/sqlite";
import { ROOM_REPLAY, ROOM_SAY, ROOM_SHOW, rooms, RUN_FIELD, type RoomAgent, type Run } from "./index.js";
import { message, type RoomEvent } from "./matrix.js";
import { promptId } from "./runs.js";

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

type Reply = string | (() => never);

/** A model that answers with fixed text, after making `calls` if given, and
 * remembers every prompt and set of instructions it saw. */
function fake(reply: Reply, id = "fake", calls: readonly ToolCall[] = []) {
  const prompts: string[] = [];
  const told: string[] = [];
  const model: Model = {
    id,
    start: ({ instructions }) => {
      told.push(instructions);
      const say = () => {
        if (typeof reply === "function") reply();
        return { text: reply as string, toolCalls: [], stop: "end_turn" as const };
      };
      return {
        async send(text) {
          prompts.push(text);
          return calls.length ? { text: "", toolCalls: calls, stop: "tool_use" } : say();
        },
        answer: async () => say(),
      };
    },
  };
  return { prompts, told, model };
}

const OWNER = "@nic:localhost";
interface Setup {
  readonly maxReplies?: number;
  readonly instructions?: string;
  readonly tools?: RoomAgent["tools"];
  readonly readOnly?: readonly string[];
  readonly calls?: readonly ToolCall[];
  readonly logs?: { log: Log; runs: Log; sessions: Log };
}
const setup = (log: Log, replies: Record<string, Reply>, options: Setup = {}) => {
  const agents = Object.fromEntries(Object.entries(replies).map(([name, reply]) =>
    [name, fake(reply, `model-${name}`, options.calls)]));
  const logs = options.logs ?? { log, runs: stores.jsonl(), sessions: stores.jsonl() };
  const room = rooms({
    ...logs,
    owner: OWNER,
    agents: Object.fromEntries(Object.entries(agents).map(([name, { model }]) =>
      [name, { model, tools: options.tools ?? {}, readOnly: options.readOnly ?? [] }])),
    ...(options.maxReplies === undefined ? {} : { maxReplies: options.maxReplies }),
    ...(options.instructions === undefined ? {} : { instructions: options.instructions }),
  });
  const say = async (text: string, name = "gooi") =>
    (await invoke(room.say, artifact(ROOM_SAY, { room: name, text }))).artifact.value as string;
  const show = async (name = "gooi") =>
    (await invoke(room.show, artifact(ROOM_SHOW, { room: name }))).artifact.value as string;
  const replay = async (request: Record<string, string> = {}) =>
    (await invoke(room.replay, artifact(ROOM_REPLAY, { room: "gooi", ...request }))).artifact.value as string;
  const runs = async () =>
    (await invoke(logs.runs.read, artifact(LOG_READ, { stream: "gooi" }))).artifact.value as unknown as Run[];
  const events = async () =>
    (await invoke(logs.log.read, artifact(LOG_READ, { stream: "gooi" }))).artifact.value as unknown as RoomEvent[];
  return { agents, room, say, show, replay, runs, events, logs };
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
  const { agents, say } = setup(stores.jsonl(), { claude: "What about you, @omlx?", omlx: "And you, @claude?" }, { maxReplies: 3 });
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

test("a room refuses a log that doesn't have the contracts it calls", () => {
  const log = stores.jsonl();
  const { model } = fake("c");
  const agents = { claude: { model, tools: {} } };
  expect(() => rooms({ log: { ...log, read: log.list }, runs: log, sessions: log, owner: OWNER, agents })).toThrow(
    "The room log's read must take urn:gooi:log:read@1 and give urn:gooi:log:entries@1, but takes urn:gooi:log:list@1",
  );
  expect(() => rooms({ log, runs: log, sessions: { ...log, append: log.read }, owner: OWNER, agents })).toThrow(
    "The session log's append must take urn:gooi:log:append@1",
  );
});

describe("runs and replay", () => {
  test("each answer records its run before it starts, and the reply names it", async () => {
    const { agents, say, runs, events, logs } = setup(stores.jsonl(), { claude: "c1" });
    await say("@claude hi");
    const [run] = await runs();
    const all = await events();
    const [asked, reply] = all.slice(-2);
    expect(run).toMatchObject({
      room: "gooi",
      asked: asked!.event_id,
      agent: "@claude:localhost",
      model: "model-claude",
      tools: [],
      prompt: promptId(agents.claude!.prompts[0]!),
    });
    expect(run!.instructions).toContain("You're one participant in a chat room");
    expect(reply!.content).toMatchObject({ body: "c1", [RUN_FIELD]: run!.run });
    const session = await invoke(logs.sessions.read, artifact(LOG_READ, { stream: run!.session }));
    expect((session.artifact.value as unknown[]).length).toBeGreaterThan(1);
  });

  test("replay re-runs the exact prompt with another backing and writes nothing to the room", async () => {
    const { agents, say, show, replay } = setup(stores.jsonl(), { claude: "Ship rooms.", omlx: "Ship pages." });
    await say("@claude what first?");
    const before = await show();
    const text = await replay({ as: "omlx" });
    expect(agents.omlx!.prompts).toEqual(agents.claude!.prompts);
    expect(await show()).toBe(before);
    expect(text).toContain("Replaying claude's latest answer in #gooi, to nic.");
    expect(text).toContain(`Same prompt: ${promptId(agents.claude!.prompts[0]!)}.`);
    expect(text).toContain("Original: claude · model-claude · instructions as recorded\nTools: none\nShip rooms.");
    expect(text).toContain("Replay: omlx · model-omlx · current instructions (unchanged)\nTools: none\nShip pages.");
  });

  test("replay uses the current instructions, or the recorded ones when asked", async () => {
    const logs = { log: stores.jsonl(), runs: stores.jsonl(), sessions: stores.jsonl() };
    await setup(logs.log, { claude: "first" }, { logs, instructions: "v1" }).say("@claude go");
    const later = setup(logs.log, { claude: "again" }, { logs, instructions: "v2" });
    expect(await later.replay()).toContain("Replay: claude · model-claude · current instructions (changed since the original)");
    expect(await later.replay({ instructions: "recorded" })).toContain("recorded instructions (unchanged)");
    expect(later.agents.claude!.told).toEqual(["v2", "v1"]);
  });

  test("read-only tools run during a replay; other calls are recorded, not applied", async () => {
    let listed = 0, added = 0;
    const tool = (description: string, count: () => void) => edge({
      operation: { input: { id: "urn:test:in", version: 1 }, output: { id: "urn:test:out", version: 1 } },
      inputSchema: { type: "object", description, properties: { title: { type: "string" } }, additionalProperties: false },
      claim: { id: "urn:test:tool", version: 1 },
      scope: description,
    }, () => { count(); return { ok: true }; });
    const tools = { list_tasks: tool("List", () => listed++), add_task: tool("Add", () => added++) };
    const calls = [
      { id: "t1", name: "list_tasks", input: {} },
      { id: "t2", name: "add_task", input: { title: "Ship it" } },
    ];
    const { say, replay } = setup(stores.jsonl(), { claude: "Added it." }, { tools, readOnly: ["list_tasks"], calls });
    await say("@claude add a task");
    expect([listed, added]).toEqual([1, 1]);
    const text = await replay();
    expect([listed, added]).toEqual([2, 1]);
    expect(text).toContain("Original: claude · model-claude · instructions as recorded\nTools: list_tasks (completed), add_task (completed)");
    expect(text).toContain('Not applied: add_task {"title":"Ship it"}');
  });

  test("an answer that failed was still recorded, so it can be replayed", async () => {
    const { say, replay } = setup(stores.jsonl(), {
      claude: () => { throw new Error("connection refused"); },
      omlx: "Here it is.",
    });
    expect(await say("@claude hello")).toEndWith("claude: (couldn't answer: connection refused)");
    expect(await replay({ as: "omlx" })).toEndWith("Here it is.");
  });

  test("replay counts back from the latest answer and refuses what it can't replay faithfully", async () => {
    const { say, replay, logs, runs, events } = setup(stores.jsonl(), { claude: "c", omlx: "o" });
    await say("@claude one");
    await say("@omlx two");
    expect(await replay({ answer: "2" })).toContain("Replaying claude's answer 2 back from the latest");
    await expect(replay({ answer: "3" })).rejects.toThrow("Room gooi has 2 agent answers; choose an answer from 1 to 2");
    await expect(replay({ as: "nobody" })).rejects.toThrow("No agent named nobody; the agents are claude, omlx");

    // An answer from before runs were recorded names no run.
    const append = (store: Log, stream: string, entries: unknown[], expectedLength: number) =>
      invoke(store.append, artifact(LOG_APPEND, { stream, expectedLength, entries } as never));
    await append(logs.log, "gooi", [message("gooi", "@claude:localhost", "old answer")], (await events()).length);
    await expect(replay()).rejects.toThrow("That answer was made before runs were recorded");

    // A run whose saved prompt isn't the one it recorded is refused, not replayed.
    const recorded = await runs();
    await append(logs.runs, "gooi", [{ ...recorded[0]!, run: "forged", session: "forged-session" }], recorded.length);
    await append(logs.sessions, "forged-session", [{ sessionId: "forged-session", update: { sessionUpdate: "user_message_chunk", content: { type: "text", text: "a different prompt" } } }], 0);
    await append(logs.log, "gooi", [message("gooi", "@claude:localhost", "forged", {}, { [RUN_FIELD]: "forged" })], (await events()).length);
    await expect(replay()).rejects.toThrow("The saved prompt for run forged doesn't match its record");
  });
});
