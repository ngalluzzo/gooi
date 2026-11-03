import { expect, test } from "bun:test";
import { ACP_PROMPT, agent } from "@gooi/agent";
import { edge, invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { claude } from "./index.js";

const ADD = { id: "urn:test:add", version: 1 };
const added: string[] = [];
const add_task = edge(
  {
    operation: { input: ADD, output: ADD },
    inputSchema: {
      description: "Add a task",
      type: "object",
      required: ["title"],
      properties: { title: { type: "string" } },
    },
    claim: { id: "urn:test:added", version: 1 },
    scope: "Added",
  },
  (input) => {
    added.push((input.value as { title: string }).title);
    return input.value;
  },
);

test("speaks the Messages API for gooi's loop, echoing Claude's blocks whole", async () => {
  const requests: Record<string, unknown>[] = [];
  const replies = [
    {
      content: [
        { type: "thinking", thinking: "", signature: "sig" },
        { type: "tool_use", id: "t1", name: "add_task", input: { title: "Renew domain" } },
      ],
      stop_reason: "tool_use",
    },
    { content: [{ type: "text", text: "Added it." }], stop_reason: "end_turn" },
  ];
  let keyReads = 0;
  const model = claude({
    apiKey: () => {
      keyReads++;
      return "test-key";
    },
    client: (key) => {
      expect(key).toBe("test-key");
      return {
        beta: {
          messages: {
            create: async (body: Record<string, unknown>) => {
              requests.push(structuredClone(body));
              return replies.shift();
            },
          },
        },
      } as never;
    },
  });
  const tell = agent({ instructions: "Turn notes into tasks.", tools: { add_task }, model });
  expect(keyReads).toBe(0);
  const result = await invoke(tell, artifact(ACP_PROMPT, { sessionId: "s", prompt: [{ type: "text", text: "renew the domain" }] }));

  expect(added).toEqual(["Renew domain"]);
  expect(keyReads).toBe(1);
  expect(requests[0]).toMatchObject({
    model: "claude-opus-5-5",
    system: "Turn notes into tasks.",
    tools: [{ name: "add_task", description: "Add a task", input_schema: { type: "object", required: ["title"] } }],
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content: "renew the domain" }],
  });
  const messages = requests[1]!.messages as unknown[];
  expect(messages[1]).toEqual({
    role: "assistant",
    content: [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "tool_use", id: "t1", name: "add_task", input: { title: "Renew domain" } },
    ],
  });
  expect(messages[2]).toEqual({
    role: "user",
    content: [{ type: "tool_result", tool_use_id: "t1", content: '{"title":"Renew domain"}', is_error: false }],
  });
  expect((result.artifact.value as { response: unknown }).response).toEqual({ stopReason: "end_turn" });
});
