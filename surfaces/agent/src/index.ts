import { randomUUID } from "node:crypto";
import {
  PROTOCOL_VERSION,
  type PromptRequest,
  type PromptResponse,
  type SessionNotification,
  type SessionUpdate,
} from "@agentclientprotocol/sdk";
import { edge, invoke, type Implementation } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import type { Value } from "@gooi/kernel/types";
import { LOG_APPEND, type Appended, type Log } from "@gooi/log";
import { ACP, acp } from "./acp.js";

export { sessionHistory } from "./history.js";

/** An ACP prompt request (a session ID and content blocks), named by the standard. */
export const ACP_PROMPT = Object.freeze({
  id: "https://agentclientprotocol.com/protocol/v1/schema#PromptRequest",
  version: PROTOCOL_VERSION,
});
/** One agent turn: the session notifications ACP agents send while working,
 * and the prompt response that ends the turn. Every object inside is ACP's. */
export const ACP_TURN = Object.freeze({ id: "urn:gooi:agent:acp-turn", version: 1 });
export const TEXT = Object.freeze({ id: "urn:gooi:agent:text", version: 1 });
const PROMPTED = Object.freeze({ id: "urn:gooi:agent:prompted", version: 1 });
const WORKED = Object.freeze({ id: "urn:gooi:agent:worked", version: 1 });

export interface Turn {
  readonly notifications: readonly SessionNotification[];
  readonly response: PromptResponse;
}
/** JSON Schema for a turn, built from ACP's published definitions. */
export const ACP_TURN_SCHEMA: Value = {
  $defs: ACP.$defs as Value,
  type: "object",
  required: ["notifications", "response"],
  additionalProperties: false,
  properties: {
    notifications: { type: "array", items: { $ref: "#/$defs/SessionNotification" } },
    response: { $ref: "#/$defs/PromptResponse" },
  },
};

// The model port: the one place gooi's loop meets a model. A backing keeps
// its own conversation in its own format; nothing here is provider-specific.
export interface ToolSpec {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Value;
}
export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
}
export interface ToolResult {
  readonly id: string;
  readonly output: string;
  readonly isError: boolean;
}
export interface ModelTurn {
  readonly text: string;
  readonly toolCalls: readonly ToolCall[];
  readonly stop: "end_turn" | "tool_use" | "max_tokens" | "refusal";
}
export interface ModelSession {
  send(text: string): Promise<ModelTurn>;
  answer(results: readonly ToolResult[]): Promise<ModelTurn>;
}
/** A backing for gooi's agent loop. The host chooses it; the app never sees it. */
export interface Model {
  /** The provider's name for the model, such as claude-opus-5-5, so a run can record what answered. */
  readonly id?: string;
  start(options: { readonly instructions: string; readonly tools: readonly ToolSpec[] }): ModelSession;
}
/** Tool names mapped to the edges an agent may call, and nothing else. */
export type Toolbox = Readonly<Record<string, Implementation>>;

const TOOL_NAME = /^[a-z][a-z0-9_]{0,63}$/u;

/** Describe a toolbox's edges as tools, from their own input schemas. */
export function toolSpecs(tools: Toolbox): ToolSpec[] {
  return Object.entries(tools).map(([name, tool]) => {
    if (!TOOL_NAME.test(name))
      throw new Error(`Tool names are lowercase letters, digits and underscores: "${name}"`);
    const schema = tool.inputSchema as { type?: unknown; description?: unknown } | undefined;
    if (schema?.type !== "object")
      throw new Error(`${name}: a tool needs an object input schema`);
    if (typeof schema.description !== "string" || !schema.description)
      throw new Error(`${name}: a tool needs a description in its input schema`);
    return { name, description: schema.description, inputSchema: tool.inputSchema! };
  });
}

/** Turn plain text into an ACP prompt for a new session. */
export function textPrompt(description: string): Implementation {
  return edge(
    {
      operation: { input: TEXT, output: ACP_PROMPT },
      inputSchema: {
        description,
        type: "object",
        required: ["text"],
        additionalProperties: false,
        properties: {
          text: { type: "string", minLength: 1, description: "What you want, in your own words" },
        },
      },
      claim: PROMPTED,
      scope: "Wrapped this text as the one text block of an ACP prompt for a new session",
    },
    (input) => ({
      sessionId: randomUUID(),
      prompt: [{ type: "text", text: (input.value as { text: string }).text }],
    }),
  );
}

/** An agent edge: one ACP prompt turn, run by gooi's loop over a host-chosen
 * model. The model may only call the toolbox's edges, and every call goes
 * through invoke, so its input is checked like any other caller's. */
export function agent(options: {
  readonly instructions: string;
  readonly tools: Toolbox;
  readonly model: Model;
  readonly maxTurns?: number;
  readonly log?: Log;
}): Implementation {
  const specs = toolSpecs(options.tools);
  const maxTurns = options.maxTurns ?? 8;
  return edge(
    {
      operation: { input: ACP_PROMPT, output: ACP_TURN },
      inputSchema: acp("PromptRequest"),
      claim: WORKED,
      scope:
        "Ran one ACP prompt turn: every tool call went through invoke on a toolbox edge, and each call and result is reported as an ACP update; excludes whether the model's choices were wise",
    },
    async (input) => {
      const request = input.value as unknown as PromptRequest;
      const blocks = request.prompt;
      if (blocks.some((block) => block.type !== "text"))
        throw new Error("This agent reads text prompts only");
      const text = blocks.map((block) => (block.type === "text" ? block.text : "")).join("\n\n");
      const { sessionId } = request;
      const { log } = options;
      let length = 0;
      async function persist(entries: readonly SessionNotification[]) {
        if (!log || !entries.length) return;
        const result = await invoke(log.append, artifact(LOG_APPEND, {
          stream: sessionId,
          expectedLength: length,
          entries,
        }));
        length = (result.artifact.value as unknown as Appended).length;
      }

      // The prompt starts a new session, before the model can fail or call tools.
      await persist(blocks.map((content) => ({
        sessionId,
        update: { sessionUpdate: "user_message_chunk", content },
      })));
      const notifications: SessionNotification[] = [];
      const note = async (update: SessionUpdate) => {
        const notification = { sessionId, update };
        await persist([notification]);
        notifications.push(notification);
      };
      const finish = (stopReason: PromptResponse["stopReason"]): Turn => ({
        notifications,
        response: { stopReason },
      });

      const session = options.model.start({ instructions: options.instructions, tools: specs });
      let turn = await session.send(text);
      for (let round = 1; ; round++) {
        if (turn.text)
          await note({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: turn.text } });
        if (turn.stop !== "tool_use" || !turn.toolCalls.length)
          return finish(turn.stop === "tool_use" ? "end_turn" : turn.stop) as unknown as Value;
        if (round >= maxTurns) return finish("max_turn_requests") as unknown as Value;
        const results: ToolResult[] = [];
        for (const call of turn.toolCalls) {
          await note({
            sessionUpdate: "tool_call",
            toolCallId: call.id,
            title: call.name,
            kind: "other",
            status: "in_progress",
            rawInput: call.input,
          });
          let update: SessionUpdate;
          try {
            const tool = Object.hasOwn(options.tools, call.name) ? options.tools[call.name] : undefined;
            if (!tool) throw new Error(`No tool named ${call.name}`);
            const result = await invoke(tool, artifact(tool.operation.input, call.input));
            update = {
              sessionUpdate: "tool_call_update",
              toolCallId: call.id,
              status: "completed",
              rawOutput: result.artifact.value,
            };
            results.push({ id: call.id, output: JSON.stringify(result.artifact.value), isError: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            update = {
              sessionUpdate: "tool_call_update",
              toolCallId: call.id,
              status: "failed",
              rawOutput: { error: message },
            };
            results.push({ id: call.id, output: message, isError: true });
          }
          await note(update);
        }
        turn = await session.answer(results);
      }
    },
  );
}
