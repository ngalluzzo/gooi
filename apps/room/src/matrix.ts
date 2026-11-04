import { randomUUID } from "node:crypto";
import type { FromSchema } from "json-schema-to-ts";
import { MATRIX } from "./matrix-v1.19.js";

// Room events are Matrix events, checked against the spec's own schemas. Only
// the shape is Matrix's: a local room has no create event, power levels or
// signatures, and its IDs use the server name below.
export const SERVER = "localhost";
const LOCALPART = /^[a-z0-9._=\-/+]+$/u;

const mentioned = {
  type: "object",
  properties: { content: { type: "object", properties: { "m.mentions": MATRIX.$defs.Mentions } } },
} as const;
const roomEvent = {
  anyOf: [{ allOf: [MATRIX.$defs.TextMessage, mentioned] }, MATRIX.$defs.Member],
} as const;

/** Matrix's GET /rooms/{roomId}/messages response: a page of a room's timeline. */
export const messagesSchema = {
  type: "object",
  description: "A page of a Matrix room timeline",
  required: ["chunk", "start"],
  properties: {
    chunk: { type: "array", items: roomEvent },
    start: { type: "string" },
    end: { type: "string" },
  },
} as const;

export type Mentions = FromSchema<typeof MATRIX.$defs.Mentions>;
export type TextMessage = FromSchema<typeof MATRIX.$defs.TextMessage> & {
  content: { "m.mentions"?: Mentions };
};
export type Member = FromSchema<typeof MATRIX.$defs.Member>;
export type RoomEvent = TextMessage | Member;
export type Messages = FromSchema<typeof messagesSchema>;

/** Contracts name the spec version whose schemas the events follow. */
export const MATRIX_MESSAGES = Object.freeze({
  id: "https://spec.matrix.org/v1.19/client-server-api/#get_matrixclientv3roomsroomidmessages",
  version: 1,
});

export function userId(name: string): string {
  if (!LOCALPART.test(name)) throw new Error(`Not a Matrix user name: ${name}`);
  return `@${name}:${SERVER}`;
}
export const roomId = (room: string) => `!${room}:${SERVER}`;
/** The local part of a Matrix user or room ID: claude in @claude:localhost. */
export const nameOf = (id: string) => id.slice(1, id.lastIndexOf(":"));

function stamp(room: string, sender: string) {
  return { room_id: roomId(room), sender, event_id: `$${randomUUID()}`, origin_server_ts: Date.now() };
}

export function join(room: string, user: string): Member {
  return {
    ...stamp(room, user),
    type: "m.room.member",
    state_key: user,
    content: { membership: "join", displayname: nameOf(user) },
  };
}

/** A text message. `extra` holds namespaced content fields, which Matrix lets
 * clients add and other clients ignore. */
export function message(
  room: string, sender: string, body: string, mentions: Mentions = {}, extra: Readonly<Record<string, string>> = {},
): TextMessage {
  return {
    ...stamp(room, sender),
    type: "m.room.message",
    content: { msgtype: "m.text", body, "m.mentions": mentions, ...extra },
  };
}

/** Users whose last membership event in the room is a join, in join order. */
export function members(events: readonly RoomEvent[]): string[] {
  const state = new Map<string, string>();
  for (const event of events)
    if (event.type === "m.room.member") {
      state.delete(event.state_key);
      state.set(event.state_key, event.content.membership);
    }
  return [...state].filter(([, membership]) => membership === "join").map(([user]) => user);
}

/** The intentional mentions in a message: @name for a member, @room for everyone. */
export function mentionsIn(text: string, among: readonly string[]): Mentions {
  const users = new Set<string>();
  for (const [, name] of text.matchAll(/(?<![\w@])@([a-z0-9._=\-/+]+)/giu)) {
    const id = `@${name!.toLowerCase().replace(/\.+$/u, "")}:${SERVER}`;
    if (among.includes(id)) users.add(id);
  }
  const room = /(?<![\w@])@room\b/iu.test(text);
  return { user_ids: [...users], ...(room ? { room: true } : {}) };
}

/** The room as plain lines: joins, then each message under its sender's name. */
export function transcript(events: readonly RoomEvent[]): string {
  return events.flatMap((event) => {
    if (event.type === "m.room.member")
      return event.content.membership === "join" ? [`* ${nameOf(event.state_key)} joined`] : [];
    return [`${nameOf(event.sender)}: ${event.content.body}`];
  }).join("\n");
}
