import OpenAI from "openai";
import type { Model, ModelTurn, ToolResult } from "@gooi/agent";

export interface OpenAICompatibleOptions {
  /** The server's /v1 base, such as a local OMLx, Ollama or LM Studio. */
  readonly baseURL: string;
  /** Read when a session starts, so commands that never use the agent need no key. */
  readonly apiKey: () => string | undefined;
  readonly model: string;
  readonly maxTokens?: number;
  /** For tests or custom transports. */
  readonly client?: (apiKey: string | undefined) => Pick<OpenAI, "chat">;
}

function parse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    // Left as text: the tool's input schema refuses it and the model is told why.
    return json;
  }
}

/** A backing for gooi's agent loop over any server speaking the OpenAI
 * chat completions API with function tools. */
export function openaiCompatible(options: OpenAICompatibleOptions): Model {
  return {
    id: options.model,
    start({ instructions, tools }) {
      const key = options.apiKey();
      const client = options.client
        ? options.client(key)
        : new OpenAI({ baseURL: options.baseURL, apiKey: key ?? "" });
      const definitions: OpenAI.Chat.ChatCompletionTool[] = tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema as Record<string, unknown>,
        },
      }));
      // The server's own history, with each assistant message echoed back as sent.
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: instructions },
      ];
      async function turn(): Promise<ModelTurn> {
        const completion = await client.chat.completions.create({
          model: options.model,
          messages,
          tools: definitions,
          tool_choice: "auto",
          max_tokens: options.maxTokens ?? 4096,
        });
        const choice = completion.choices[0];
        if (!choice) throw new Error("The model returned no choices");
        messages.push(choice.message as OpenAI.Chat.ChatCompletionMessageParam);
        const toolCalls = (choice.message.tool_calls ?? []).flatMap((call) =>
          call.type === "function"
            ? [{ id: call.id, name: call.function.name, input: parse(call.function.arguments) }]
            : [],
        );
        const stop =
          choice.finish_reason === "tool_calls"
            ? "tool_use"
            : choice.finish_reason === "length"
              ? "max_tokens"
              : choice.finish_reason === "content_filter"
                ? "refusal"
                : "end_turn";
        return { text: choice.message.content ?? "", toolCalls, stop };
      }
      return {
        send(text) {
          messages.push({ role: "user", content: text });
          return turn();
        },
        answer(results: readonly ToolResult[]) {
          for (const result of results)
            messages.push({ role: "tool", tool_call_id: result.id, content: result.output });
          return turn();
        },
      };
    },
  };
}
