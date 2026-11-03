import { expect, test } from "bun:test";
import { ACP_PROMPT, agent, type Turn } from "@gooi/agent";
import { edge, invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { openaiCompatible } from "./index.js";

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

function server(replies: unknown[]) {
  const requests: Record<string, unknown>[] = [];
  const model = openaiCompatible({
    baseURL: "http://127.0.0.1:8000/v1",
    apiKey: () => "local-key",
    model: "Qwen3.8-27B-Q8_0",
    client: () =>
      ({
        chat: {
          completions: {
            create: async (body: Record<string, unknown>) => {
              requests.push(structuredClone(body));
              return replies.shift();
            },
          },
        },
      }) as never,
  });
  return { model, requests };
}
const prompt = (text: string) => artifact(ACP_PROMPT, { sessionId: "s", prompt: [{ type: "text", text }] });

test("speaks chat completions for gooi's loop, echoing the server's messages as sent", async () => {
  const assistant = {
    role: "assistant",
    content: null,
    reasoning_content: "The user wants a task.",
    tool_calls: [{ id: "c1", type: "function", function: { name: "add_task", arguments: '{"title":"Renew domain"}' } }],
  };
  const { model, requests } = server([
    { choices: [{ finish_reason: "tool_calls", message: assistant }] },
    { choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Added it." } }] },
  ]);
  const result = await invoke(agent({ instructions: "Turn notes into tasks.", tools: { add_task }, model }), prompt("renew the domain"));

  expect(added).toEqual(["Renew domain"]);
  expect(requests[0]).toMatchObject({
    model: "Qwen3.8-27B-Q8_0",
    tool_choice: "auto",
    tools: [{ type: "function", function: { name: "add_task", description: "Add a task", parameters: { required: ["title"] } } }],
    messages: [
      { role: "system", content: "Turn notes into tasks." },
      { role: "user", content: "renew the domain" },
    ],
  });
  const messages = requests[1]!.messages as unknown[];
  expect(messages[2]).toEqual(assistant);
  expect(messages[3]).toEqual({ role: "tool", tool_call_id: "c1", content: '{"title":"Renew domain"}' });
  const turn = result.artifact.value as unknown as Turn;
  expect(turn.notifications.at(-1)!.update).toEqual({
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text: "Added it." },
  });
  expect(turn.response).toEqual({ stopReason: "end_turn" });
});

test("arguments that aren't JSON go back to the model as a refused call", async () => {
  const { model, requests } = server([
    { choices: [{ finish_reason: "tool_calls", message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "add_task", arguments: "{title: oops" } }] } }] },
    { choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Sorry." } }] },
  ]);
  await invoke(agent({ instructions: "x", tools: { add_task }, model }), prompt("go"));
  const messages = requests[1]!.messages as unknown[];
  expect(messages[3]).toEqual({ role: "tool", tool_call_id: "c1", content: expect.stringContaining("Input must be object") });
});
