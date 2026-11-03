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
  "You exist only while you answer: you speak when someone mentions you, and between turns you remember nothing except what's written in the room.",
  "Your tools are the only actions you can take. Use them when the conversation calls for it and say what they did. If something needs doing that your tools can't do, say so and say who could do it, usually the owner.",
  "Never promise to do something later or say you're working on something: you won't be there to do it. Say only what you did in this reply.",
  "To ask another participant something, mention them with @ and their name, like @claude; whoever you mention answers next. Mention someone only when you need a new answer from them, and never yourself.",
  "Don't repeat what's already in the room. If you have nothing new to add, say so in one sentence and mention no one, so the conversation can end.",
  "Don't speak for the other participants.",
].join("\n");

export interface RoomOptions {
  /** Where rooms live: one log stream per room. */
  readonly log: Log;
  /** The owner's Matrix user ID. */
  readonly owner: string;
  /** Agent edges (ACP prompt to turn) by Matrix user name. Each new room joins them all. */
  readonly agents: Readonly<Record<string, Implementation>>;
  /** The most agent replies one owner message can lead to, so agents that keep
   * mentioning each other stop and the owner speaks again. Defaults to 6. */
  readonly maxReplies?: number;
}

/** Rooms on a log: post as the owner, let mentioned agents answer, read a room back. */
export function rooms({ log, owner, agents, maxReplies = 6 }: RoomOptions) {
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
  async function answerAs(name: string, agentId: string, left: number): Promise<TextMessage> {
    const before = await read(name);
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

  /** The agents a message asks to answer: the ones it mentions, or all of them
   * for @room, never its own sender. People are mentioned but never called. */
  function called(event: TextMessage) {
    const mentions = event.content["m.mentions"] ?? {};
    const ids = mentions.room ? [...agentIds.keys()] : (mentions.user_ids ?? []).filter((id) => agentIds.has(id));
    return ids.filter((id) => id !== event.sender).map((agent) => ({ room: nameOf(event.room_id), agent }));
  }

  const answer = edge({
    operation: { input: MATRIX_MESSAGES, output: MATRIX_MESSAGES },
    inputSchema: messagesSchema,
    claim: contract("answered"),
    scope: "Each agent a message mentioned answered in turn through a new ACP session, the owner's mentions first and then whoever each reply mentioned, until no one was asked or the reply limit was reached",
  }, async (input) => {
    const posted = input.value as unknown as Messages;
    const chunk = posted.chunk as RoomEvent[];
    const replies: TextMessage[] = [];
    // Who has been asked, in order: the owner's mentions, then whoever each reply
    // brings in. An agent already waiting isn't asked twice; when its turn comes
    // it sees everything said before it.
    const asked: { room: string; agent: string }[] = [];
    const ask = (event: TextMessage) => {
      for (const next of called(event))
        if (!asked.some(({ room, agent }) => room === next.room && agent === next.agent)) asked.push(next);
    };
    for (const event of chunk) if (event.type === "m.room.message") ask(event);
    while (asked.length && replies.length < maxReplies) {
      const { room: name, agent } = asked.shift()!;
      const reply = await answerAs(name, agent, maxReplies - replies.length - 1);
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
