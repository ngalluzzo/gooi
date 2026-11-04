import { randomUUID } from "node:crypto";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import { ACP_PROMPT, agent, type Model, type Toolbox, type Turn } from "@gooi/agent";
import { edge, invoke, path, type Implementation } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import type { Contract, Value } from "@gooi/kernel/types";
import { LOG_APPEND, LOG_APPENDED, LOG_ENTRIES, LOG_READ, LogConflict, type Log } from "@gooi/log";
import {
  join, MATRIX_MESSAGES, members, mentionsIn, message, messagesSchema, nameOf, roomId, transcript,
  userId, type Messages, type RoomEvent, type TextMessage,
} from "./matrix.js";
import { promptId, promptIn, RUN_FIELD, spokenIn, toolsIn, type Run, type ToolUse } from "./runs.js";

export { MATRIX_MESSAGES, transcript, userId, type RoomEvent } from "./matrix.js";
export { RUN_FIELD, type Run } from "./runs.js";

const contract = (name: string) => Object.freeze({ id: `urn:gooi:room:${name}`, version: 1 });
export const ROOM_SAY = contract("say");
export const ROOM_SHOW = contract("show");
export const ROOM_TRANSCRIPT = contract("transcript");
export const ROOM_REPLAY = contract("replay");
export const ROOM_REPLAYED = contract("replayed");
export const ROOM_REPLAY_TEXT = contract("replay-text");

const room = {
  type: "string",
  pattern: "^[a-z0-9][a-z0-9_.-]{0,63}$",
  description: "Room name: lowercase letters, digits, dots, dashes and underscores",
};

/** What a room agent is for, in plain text any model can follow. */
export const instructions = [
  "You're one participant in a chat room with the owner and other agents.",
  "The prompt shows the room so far and says who you are. Reply to the latest message that mentions you, in a few sentences, as yourself.",
  "You exist only while you answer: you speak when someone mentions you, and between turns you remember nothing except what's written in the room.",
  "Your tools are the only actions you can take. Use them when the conversation calls for it and say what they did. If something needs doing that your tools can't do, say so and say who could do it, usually the owner.",
  "Never promise to do something later or say you're working on something: you won't be there to do it. Say only what you did in this reply.",
  "To ask another participant something, mention them with @ and their name as the room shows it; whoever you mention answers next. Mention someone only when you need a new answer from them, and never yourself.",
  "Don't repeat what's already in the room. If you have nothing new to add, say so in one sentence and mention no one, so the conversation can end.",
  "Don't speak for the other participants.",
].join("\n");

/** One agent in the room: its model and the edges it may call. */
export interface RoomAgent {
  readonly model: Model;
  readonly tools: Toolbox;
  /** Tool names that only read, the distinction Smithy's smithy.api#readonly
   * trait and HTTP's safe methods draw. A replay runs these for real and
   * records every other call instead of applying it. */
  readonly readOnly?: readonly string[];
}

export interface RoomOptions {
  /** Where rooms live: one log stream per room. */
  readonly log: Log;
  /** Where each room's run records live: one stream per room. */
  readonly runs: Log;
  /** Where each answer's ACP session is saved, by session ID. */
  readonly sessions: Log;
  /** The owner's Matrix user ID. */
  readonly owner: string;
  /** The agents by Matrix user name. Each new room joins them all. */
  readonly agents: Readonly<Record<string, RoomAgent>>;
  /** What every agent is told; defaults to this package's instructions. */
  readonly instructions?: string;
  /** The most agent replies one owner message can lead to, so agents that keep
   * mentioning each other stop and the owner speaks again. Defaults to 6. */
  readonly maxReplies?: number;
}

const show = (c: Contract) => `${c.id}@${c.version}`;

/** Refuse wiring whose edge doesn't take and give the contracts the room calls it with. */
function expect(what: string, given: Implementation, input: Contract, output: Contract) {
  const { operation } = given;
  if (show(operation.input) !== show(input) || show(operation.output) !== show(output))
    throw new Error(
      `${what} must take ${show(input)} and give ${show(output)}, ` +
        `but takes ${show(operation.input)} and gives ${show(operation.output)}`,
    );
}

/** Rooms on a log: post as the owner, let mentioned agents answer, read a room
 * back, and replay a past answer from its run record. */
export function rooms(options: RoomOptions) {
  const { log, runs, sessions, owner, maxReplies = 6 } = options;
  const told = options.instructions ?? instructions;
  for (const [what, store] of [["room log", log], ["run log", runs], ["session log", sessions]] as const) {
    expect(`The ${what}'s append`, store.append, LOG_APPEND, LOG_APPENDED);
    expect(`The ${what}'s read`, store.read, LOG_READ, LOG_ENTRIES);
  }
  const agents = new Map(Object.entries(options.agents).map(([name, spec]) => [userId(name), {
    ...spec,
    edge: agent({ instructions: told, tools: spec.tools, model: spec.model, log: sessions }),
  }]));
  if (agents.has(owner)) throw new Error(`The owner ${owner} can't also be an agent`);

  async function read<T>(store: Log, stream: string): Promise<T[]> {
    const result = await invoke(store.read, artifact(LOG_READ, { stream }));
    return result.artifact.value as unknown as T[];
  }

  /** Append what `next` makes from the stream so far. A conflicting write
   * re-reads the stream and tries again, so people's messages all land. */
  async function append<T>(store: Log, stream: string, next: (before: readonly T[]) => T[]) {
    for (let attempt = 1; ; attempt++) {
      const before = await read<T>(store, stream);
      const entries = next(before);
      try {
        await invoke(store.append, artifact(LOG_APPEND, {
          stream, expectedLength: before.length, entries: entries as unknown as Value[],
        }));
        return { before, entries };
      } catch (error) {
        if (!(error instanceof LogConflict) || attempt === 3) throw error;
      }
    }
  }

  const post = edge({
    operation: { input: ROOM_SAY, output: MATRIX_MESSAGES },
    inputSchema: {
      type: "object",
      description: "Post to a room as the owner; agents you mention with @name answer",
      required: ["room", "text"],
      additionalProperties: false,
      properties: {
        room,
        text: {
          type: "string",
          minLength: 1,
          description: "Your message; @name mentions an agent and @room mentions everyone",
        },
      },
    },
    claim: contract("posted"),
    scope: "Appended the owner's message to the room's log stream, after joining the owner and every agent if the room was new",
  }, async (input) => {
    const { room: name, text } = input.value as { room: string; text: string };
    const { before, entries } = await append<RoomEvent>(log, name, (before) => {
      const joins = before.length ? [] : [owner, ...agents.keys()].map((user) => join(name, user));
      const present = members([...before, ...joins]);
      return [...joins, message(name, owner, text, mentionsIn(text, present))];
    });
    return page(entries, before.length);
  });

  /** Run one agent turn on a prompt, in a new ACP session, and say what came of it. */
  async function turn(edge: Implementation, session: string, prompt: string) {
    try {
      const result = await invoke(edge, artifact(ACP_PROMPT, {
        sessionId: session,
        prompt: [{ type: "text", text: prompt }],
      }));
      const { notifications, response } = result.artifact.value as unknown as Turn;
      return {
        body: spokenIn(notifications) || `(no reply; stopped: ${response.stopReason})`,
        tools: toolsIn(notifications),
      };
    } catch (error) {
      return { body: `(couldn't answer: ${error instanceof Error ? error.message : String(error)})`, tools: [] };
    }
  }

  // One ACP session per answer: the room is the shared memory, so each turn's
  // prompt is the room so far. The run is recorded before the agent starts, so
  // an answer that fails can still be replayed.
  async function answerAs(name: string, agentId: string, asked: string, left: number): Promise<TextMessage> {
    const before = await read<RoomEvent>(log, name);
    const others = members(before).filter((id) => id !== agentId)
      .map((id) => id === owner ? `${nameOf(id)} (the owner)` : `@${nameOf(id)}`);
    const prompt = [
      `Room ${roomId(name)} so far:`,
      transcript(before),
      `You are ${nameOf(agentId)} (${agentId}). Also here: ${others.join(", ")}.`,
      left > 0
        ? `Reply to the latest message that mentions you. ${left} more agent ${left === 1 ? "reply" : "replies"} can follow yours before the owner speaks again.`
        : "Reply to the latest message that mentions you. Yours is the last agent reply before the owner speaks again, so don't ask anyone else to answer.",
    ].join("\n\n");
    const spec = agents.get(agentId)!;
    const run: Run = {
      run: randomUUID(),
      room: name,
      asked,
      agent: agentId,
      model: spec.model.id ?? null,
      instructions: told,
      tools: Object.keys(spec.tools),
      readOnly: spec.readOnly ?? [],
      session: randomUUID(),
      prompt: promptId(prompt),
      at: Date.now(),
    };
    await append<Run>(runs, name, () => [run]);
    const { body } = await turn(spec.edge, run.session, prompt);
    const { entries } = await append<RoomEvent>(log, name, (now) =>
      [message(name, agentId, body, mentionsIn(body, members(now)), { [RUN_FIELD]: run.run })]);
    return entries[0] as TextMessage;
  }

  /** The agents a message asks to answer: the ones it mentions, or all of them
   * for @room, never its own sender. People are mentioned but never called. */
  function called(event: TextMessage) {
    const mentions = event.content["m.mentions"] ?? {};
    const ids = mentions.room ? [...agents.keys()] : (mentions.user_ids ?? []).filter((id) => agents.has(id));
    return ids.filter((id) => id !== event.sender)
      .map((agent) => ({ room: nameOf(event.room_id), agent, asked: event.event_id }));
  }

  const answer = edge({
    operation: { input: MATRIX_MESSAGES, output: MATRIX_MESSAGES },
    inputSchema: messagesSchema,
    claim: contract("answered"),
    scope: "Each agent a message mentioned answered in turn through a new ACP session, the owner's mentions first and then whoever each reply mentioned, until no one was asked or the reply limit was reached; each answer's run was recorded first",
  }, async (input) => {
    const posted = input.value as unknown as Messages;
    const chunk = posted.chunk as RoomEvent[];
    const replies: TextMessage[] = [];
    // Who has been asked, in order: the owner's mentions, then whoever each reply
    // brings in. An agent already waiting isn't asked twice; when its turn comes
    // it sees everything said before it.
    const asked: { room: string; agent: string; asked: string }[] = [];
    const ask = (event: TextMessage) => {
      for (const next of called(event))
        if (!asked.some(({ room, agent }) => room === next.room && agent === next.agent)) asked.push(next);
    };
    for (const event of chunk) if (event.type === "m.room.message") ask(event);
    while (asked.length && replies.length < maxReplies) {
      const next = asked.shift()!;
      const reply = await answerAs(next.room, next.agent, next.asked, maxReplies - replies.length - 1);
      replies.push(reply);
      ask(reply);
    }
    // Others may write between replies, so the result is no longer one contiguous page: no end token.
    return { chunk: [...chunk, ...replies], start: posted.start } as unknown as Value;
  });

  const load = edge({
    operation: { input: ROOM_SHOW, output: MATRIX_MESSAGES },
    inputSchema: {
      type: "object",
      description: "Show a room's messages",
      required: ["room"],
      additionalProperties: false,
      properties: { room },
    },
    claim: contract("loaded"),
    scope: "Read the room's whole timeline from its log stream, in order",
  }, async (input) => {
    const { room: name } = input.value as { room: string };
    const events = await read<RoomEvent>(log, name);
    if (!events.length) throw new Error(`No room named ${name}`);
    return page(events, 0);
  });

  const render = edge({
    operation: { input: MATRIX_MESSAGES, output: ROOM_TRANSCRIPT },
    inputSchema: messagesSchema,
    claim: contract("rendered"),
    scope: "Rendered joins and text messages as plain lines under each sender's name",
  }, (input) => transcript((input.value as unknown as Messages).chunk as RoomEvent[]));

  const replayed = edge({
    operation: { input: ROOM_REPLAY, output: ROOM_REPLAYED },
    inputSchema: {
      type: "object",
      description: "Re-run a past agent answer from its run record, with another agent's backing or the current instructions; writes nothing to the room",
      required: ["room"],
      additionalProperties: false,
      properties: {
        room,
        answer: {
          type: "string",
          pattern: "^[1-9][0-9]{0,5}$",
          description: "Which agent answer, counting back from the latest: 1 is the latest (the default)",
        },
        as: {
          type: "string",
          pattern: "^[a-z0-9._=\\-/+]+$",
          description: "Which agent's backing answers the replay; defaults to the one that answered",
        },
        instructions: {
          type: "string",
          enum: ["current", "recorded"],
          description: "The instructions to replay with: current (the default) or the ones the answer had",
        },
      },
    },
    claim: contract("replayed-answer"),
    scope: "Re-ran a recorded answer's exact prompt, checked by its artifact ID, through a new ACP session; read-only tools ran, every other tool call was recorded and not applied, and nothing was written to the room",
  }, async (input) => {
    const request = input.value as { room: string; answer?: string; as?: string; instructions?: "current" | "recorded" };
    const events = await read<RoomEvent>(log, request.room);
    const answers = events.filter((event): event is TextMessage =>
      event.type === "m.room.message" && agents.has(event.sender));
    const back = Number(request.answer ?? "1");
    const original = answers[answers.length - back];
    if (!original)
      throw new Error(`Room ${request.room} has ${answers.length} agent answers; choose an answer from 1 to ${answers.length}`);
    const runId = original.content[RUN_FIELD];
    if (typeof runId !== "string")
      throw new Error("That answer was made before runs were recorded, so it can't be replayed; ask again and replay the new answer");
    const run = (await read<Run>(runs, request.room)).find((entry) => entry.run === runId);
    if (!run) throw new Error(`No run record ${runId} in room ${request.room}`);

    const saved = await read<SessionNotification>(sessions, run.session);
    const prompt = promptIn(saved);
    if (promptId(prompt) !== run.prompt)
      throw new Error(`The saved prompt for run ${run.run} doesn't match its record, so this would replay a different input`);

    const agentId = request.as === undefined ? run.agent : userId(request.as);
    const spec = agents.get(agentId);
    if (!spec)
      throw new Error(`No agent named ${request.as}; the agents are ${[...agents.keys()].map(nameOf).join(", ")}`);
    const instructed = request.instructions === "recorded" ? run.instructions : told;

    // Read-only tools run for real; every other call is recorded and answered as not applied.
    const withheld: { name: string; input: Value }[] = [];
    const readOnly = new Set(spec.readOnly ?? []);
    const tools = Object.fromEntries(Object.entries(spec.tools).map(([name, tool]) => [name, readOnly.has(name)
      ? tool
      : edge({
          operation: tool.operation,
          ...(tool.inputSchema === undefined ? {} : { inputSchema: tool.inputSchema }),
          claim: contract("withheld"),
          scope: "Recorded a tool call that a replay must not apply, and applied nothing",
        }, (call) => {
          withheld.push({ name, input: call.value });
          return { notApplied: "This is a replay of a past answer, so this call was recorded but not applied." };
        })]));
    const session = randomUUID();
    const again = await turn(
      agent({ instructions: instructed, tools, model: spec.model, log: sessions }), session, prompt);

    const askedBy = events.find((event) => event.event_id === run.asked)?.sender;
    return {
      room: request.room,
      answer: back,
      prompt: run.prompt,
      asked: askedBy ? nameOf(askedBy) : null,
      original: {
        agent: nameOf(run.agent), model: run.model, instructions: "recorded",
        body: original.content.body, tools: toolsIn(saved),
      },
      replay: {
        agent: nameOf(agentId), model: spec.model.id ?? null, instructions: request.instructions ?? "current",
        instructionsChanged: instructed !== run.instructions,
        body: again.body, tools: again.tools, withheld, session,
      },
    } as unknown as Value;
  });

  const renderReplay = edge({
    operation: { input: ROOM_REPLAYED, output: ROOM_REPLAY_TEXT },
    claim: contract("replay-rendered"),
    scope: "Rendered the original answer and its replay one after the other, with what differed between them",
  }, (input) => replayText(input.value as unknown as Replayed));

  return { say: path(post, answer, render), show: path(load, render), replay: path(replayed, renderReplay) };
}

interface Side {
  readonly agent: string;
  readonly model: string | null;
  readonly instructions: string;
  readonly body: string;
  readonly tools: readonly ToolUse[];
}
interface Replayed {
  readonly room: string;
  readonly answer: number;
  readonly prompt: string;
  readonly asked: string | null;
  readonly original: Side;
  readonly replay: Side & { readonly instructionsChanged: boolean; readonly withheld: readonly { name: string; input: Value }[] };
}

function replayText({ room, answer, prompt, asked, original, replay }: Replayed): string {
  const which = answer === 1 ? "latest answer" : `answer ${answer} back from the latest`;
  const who = (side: Side) => [side.agent, side.model].filter(Boolean).join(" · ");
  const tools = (uses: readonly ToolUse[]) =>
    uses.length ? uses.map(({ name, status }) => `${name} (${status})`).join(", ") : "none";
  return [
    `Replaying ${original.agent}'s ${which} in #${room}${asked ? `, to ${asked}` : ""}.`,
    `Same prompt: ${prompt}. Read-only tools read today's data; other tool calls are recorded, not applied.`,
    "",
    `Original: ${who(original)} · instructions as recorded`,
    `Tools: ${tools(original.tools)}`,
    original.body,
    "",
    `Replay: ${who(replay)} · ${replay.instructions} instructions${replay.instructionsChanged ? " (changed since the original)" : " (unchanged)"}`,
    `Tools: ${tools(replay.tools)}`,
    ...replay.withheld.map(({ name, input }) => `Not applied: ${name} ${JSON.stringify(input)}`),
    replay.body,
  ].join("\n");
}

function page(events: readonly RoomEvent[], start: number): Value {
  return { chunk: events, start: String(start), end: String(start + events.length) } as unknown as Value;
}
