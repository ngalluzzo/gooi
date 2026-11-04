import type { SessionNotification } from "@agentclientprotocol/sdk";
import { artifact, artifactId } from "@gooi/kernel/evidence";
import type { Digest } from "@gooi/kernel/types";

/** The content field a reply uses to name the run that produced it. Matrix
 * lets clients add namespaced fields; other clients ignore them. */
export const RUN_FIELD = "dev.gooi.run";

/** The exact prompt an agent answered, identified by its content. */
export const ROOM_PROMPT = Object.freeze({ id: "urn:gooi:room:prompt", version: 1 });
export const promptId = (text: string): Digest => artifactId(artifact(ROOM_PROMPT, { text }));

/** What produced one agent answer: AGENTS.md's run record (caller, request ID,
 * exact input, state) for a room. It is the room app's own record; the prompt,
 * tool calls and results live in the answer's ACP session, and the record pins
 * the prompt by its artifact ID. */
export interface Run {
  /** The request ID, carried by the reply under RUN_FIELD. */
  readonly run: string;
  readonly room: string;
  /** The caller: the event ID of the message that asked. */
  readonly asked: string;
  /** The agent's Matrix user ID. */
  readonly agent: string;
  /** The backing's name for its model, when it gives one. */
  readonly model: string | null;
  readonly instructions: string;
  readonly tools: readonly string[];
  /** The tools that only read, as marked when the answer ran. */
  readonly readOnly: readonly string[];
  /** The ACP session that holds the prompt, the tool calls and their results. */
  readonly session: string;
  readonly prompt: Digest;
  readonly at: number;
}

export interface ToolUse {
  readonly name: string;
  readonly status: string;
}

/** The text of the prompt that started a saved ACP session. */
export function promptIn(notifications: readonly SessionNotification[]): string {
  return notifications.flatMap(({ update }) =>
    update.sessionUpdate === "user_message_chunk" && update.content.type === "text" ? [update.content.text] : [],
  ).join("\n\n");
}

/** What the agent said in a turn: its message chunks, in order. */
export function spokenIn(notifications: readonly SessionNotification[]): string {
  return notifications.flatMap(({ update }) =>
    update.sessionUpdate === "agent_message_chunk" && update.content.type === "text" ? [update.content.text] : [],
  ).join("\n\n");
}

/** Each tool the agent called and how the call ended. */
export function toolsIn(notifications: readonly SessionNotification[]): ToolUse[] {
  const calls = new Map<string, { name: string; status: string }>();
  for (const { update } of notifications) {
    if (update.sessionUpdate === "tool_call")
      calls.set(update.toolCallId, { name: update.title, status: update.status ?? "pending" });
    else if (update.sessionUpdate === "tool_call_update" && update.status) {
      const call = calls.get(update.toolCallId);
      if (call) call.status = update.status;
    }
  }
  return [...calls.values()];
}
