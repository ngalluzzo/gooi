import { randomUUID } from "node:crypto";
import { ACP_PROMPT, type Turn } from "@gooi/agent";
import { edge, invoke, path, type Implementation } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import type { Value } from "@gooi/kernel/types";
import { LOG_APPEND, LOG_READ, LogConflict, type Log } from "@gooi/log";
import {
  join, MATRIX_MESSAGES, members, mentionsIn, message, messagesSchema, nameOf, roomId, transcript,
  userId, type Messages, type RoomEvent, type TextMessage,
} from "./matrix.js";

export { MATRIX_MESSAGES, transcript, userId, type RoomEvent } from "./matrix.js";

const contract = (name: string) => Object.freeze({ id: `urn:gooi:room:${name}`, version: 1 });
export const ROOM_SAY = contract("say");
export const ROOM_SHOW = contract("show");
export const ROOM_TRANSCRIPT = contract("transcript");

const room = {
  type: "string",
  pattern: "^[a-z0-9][a-z0-9_.-]{0,63}$",
  description: "Room name: lowercase letters, digits, dots, dashes and underscores",
};

/** What a room agent is for, in plain text any model can follow. */
export const instructions = [
  "You're one participant in a chat room with the owner and other agents.",
  "The prompt shows the room so far and says who you are. Reply to the latest message that mentions you, in a few sentences, as yourself.",
  "Use your tools when the conversation calls for it, and say what you did.",
  "Don't speak for the other participants.",
].join("\n");

export interface RoomOptions {
  /** Where rooms live: one log stream per room. */
  readonly log: Log;
  /** The owner's Matrix user ID; only the owner's messages start agent turns. */
  readonly owner: string;
  /** Agent edges (ACP prompt to turn) by Matrix user name. Each new room joins them all. */
  readonly agents: Readonly<Record<string, Implementation>>;
}

/** Rooms on a log: post as the owner, let mentioned agents answer, read a room back. */
export function rooms({ log, owner, agents }: RoomOptions) {
  const agentIds = new Map(Object.entries(agents).map(([name, agent]) => [userId(name), agent]));
  if (agentIds.has(owner)) throw new Error(`The owner ${owner} can't also be an agent`);

  async function read(name: string): Promise<RoomEvent[]> {
    const result = await invoke(log.read, artifact(LOG_READ, { stream: name }));
    return result.artifact.value as unknown as RoomEvent[];
  }

  /** Append the events `next` makes from the room so far. People's messages
   * should all land, so a conflicting write re-reads the room and tries again. */
  async function append(name: string, next: (before: readonly RoomEvent[]) => RoomEvent[]) {
    for (let attempt = 1; ; attempt++) {
      const before = await read(name);
      const events = next(before);
      try {
        await invoke(log.append, artifact(LOG_APPEND, {
          stream: name, expectedLength: before.length, entries: events as unknown as Value[],
        }));
        return { before, events };
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
    const { before, events } = await append(name, (before) => {
      const joins = before.length ? [] : [owner, ...agentIds.keys()].map((user) => join(name, user));
      const present = members([...before, ...joins]);
      return [...joins, message(name, owner, text, mentionsIn(text, present))];
    });
    return page(events, before.length);
  });

  // One ACP session per answer: the room is the shared memory, so each turn's
  // prompt is the room so far, and the session keeps that turn's tool calls.
  async function answerAs(name: string, agentId: string): Promise<TextMessage> {
    const before = await read(name);
    const prompt = [
      `Room ${roomId(name)} so far:`,
      transcript(before),
      `You are ${nameOf(agentId)} (${agentId}). Reply to the latest message that mentions you.`,
    ].join("\n\n");
    let body: string;
    try {
      const result = await invoke(agentIds.get(agentId)!, artifact(ACP_PROMPT, {
        sessionId: randomUUID(),
        prompt: [{ type: "text", text: prompt }],
      }));
      const turn = result.artifact.value as unknown as Turn;
      const said = turn.notifications.flatMap(({ update }) =>
        update.sessionUpdate === "agent_message_chunk" && update.content.type === "text"
          ? [update.content.text] : []);
      body = said.join("\n\n") || `(no reply; stopped: ${turn.response.stopReason})`;
    } catch (error) {
      body = `(couldn't answer: ${error instanceof Error ? error.message : String(error)})`;
    }
    const { events } = await append(name, (now) =>
      [message(name, agentId, body, mentionsIn(body, members(now)))]);
    return events[0] as TextMessage;
  }

  const answer = edge({
    operation: { input: MATRIX_MESSAGES, output: MATRIX_MESSAGES },
    inputSchema: messagesSchema,
    claim: contract("answered"),
    scope: "Each agent mentioned in an owner's message answered once, in mention order, through a new ACP session; agents' own mentions start no turns",
  }, async (input) => {
    const posted = input.value as unknown as Messages;
    const chunk = posted.chunk as RoomEvent[];
    const replies: TextMessage[] = [];
    for (const event of chunk) {
      if (event.type !== "m.room.message" || event.sender !== owner) continue;
      const mentions = event.content["m.mentions"] ?? {};
      const targets = mentions.room ? [...agentIds.keys()] : (mentions.user_ids ?? []).filter((id) => agentIds.has(id));
      const name = nameOf(event.room_id);
      for (const agentId of targets) replies.push(await answerAs(name, agentId));
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
    const events = await read(name);
    if (!events.length) throw new Error(`No room named ${name}`);
    return page(events, 0);
  });

  const render = edge({
    operation: { input: MATRIX_MESSAGES, output: ROOM_TRANSCRIPT },
    inputSchema: messagesSchema,
    claim: contract("rendered"),
    scope: "Rendered joins and text messages as plain lines under each sender's name",
  }, (input) => transcript((input.value as unknown as Messages).chunk as RoomEvent[]));

  return { say: path(post, answer, render), show: path(load, render) };
}

function page(events: readonly RoomEvent[], start: number): Value {
  return { chunk: events, start: String(start), end: String(start + events.length) } as unknown as Value;
}
