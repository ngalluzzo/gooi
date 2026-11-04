import Anthropic from "@anthropic-ai/sdk";
import type { Model, ModelTurn, ToolResult } from "@gooi/agent";

export interface ClaudeOptions {
  /** Read when a session starts, so commands that never use the agent need no key.
   * Undefined falls back to the SDK's own lookup (ANTHROPIC_API_KEY, `ant auth`). */
  readonly apiKey: () => string | undefined;
  readonly model?: string;
  /** Claude Opus 5.5 defaults to medium; set here so it's never implicit. */
  readonly effort?: "low" | "medium" | "high" | "xhigh" | "max";
  readonly maxTokens?: number;
  /** For tests or custom transports. */
  readonly client?: (apiKey: string | undefined) => Pick<Anthropic, "beta">;
}

/** A Claude backing for gooi's agent loop, through the Anthropic SDK. Refused
 * requests rerun server-side on Anthropic's recommended fallback model. */
export function claude(options: ClaudeOptions): Model {
  const model = options.model ?? "claude-opus-5-5";
  return {
    id: model,
    start({ instructions, tools }) {
      const key = options.apiKey();
      const client = options.client ? options.client(key) : new Anthropic(key ? { apiKey: key } : {});
      const definitions: Anthropic.Beta.BetaTool[] = tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema as unknown as Anthropic.Beta.BetaTool.InputSchema,
      }));
      // Claude's own history, echoed back whole: thinking and fallback blocks included.
      const messages: Anthropic.Beta.BetaMessageParam[] = [];
      async function turn(): Promise<ModelTurn> {
        const response = await client.beta.messages.create({
          model,
          max_tokens: options.maxTokens ?? 16000,
          system: instructions,
          tools: definitions,
          messages,
          output_config: { effort: options.effort ?? "medium" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
        messages.push({ role: "assistant", content: response.content });
        const text = response.content
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join("");
        const toolCalls = response.content.flatMap((block) =>
          block.type === "tool_use" ? [{ id: block.id, name: block.name, input: block.input }] : [],
        );
        const stop =
          response.stop_reason === "tool_use" ||
          response.stop_reason === "max_tokens" ||
          response.stop_reason === "refusal"
            ? response.stop_reason
            : "end_turn";
        return { text, toolCalls, stop };
      }
      return {
        send(text) {
          messages.push({ role: "user", content: text });
          return turn();
        },
        answer(results: readonly ToolResult[]) {
          messages.push({
            role: "user",
            content: results.map((result) => ({
              type: "tool_result" as const,
              tool_use_id: result.id,
              content: result.output,
              is_error: result.isError,
            })),
          });
          return turn();
        },
      };
    },
  };
}
