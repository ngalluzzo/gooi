import { describe, expect, test } from "bun:test";
import { edge, invoke, path } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import {
  ACP_PROMPT,
  ACP_TURN,
  ACP_TURN_SCHEMA,
  agent,
  textPrompt,
  toolSpecs,
  type Model,
  type ModelTurn,
  type ToolResult,
  type ToolSpec,
  type Turn,
} from "./index.js";

const ADD = { id: "urn:test:add", version: 1 };
const LIST = { id: "urn:test:list", version: 1 };
const OUT = { id: "urn:test:out", version: 1 };
const claim = { id: "urn:test:did", version: 1 };

function tasks() {
  const titles: string[] = [];
  return {
    titles,
    tools: {
      add_task: edge(
        {
          operation: { input: ADD, output: OUT },
          inputSchema: {
            description: "Add a task",
            type: "object",
            required: ["title"],
            additionalProperties: false,
            properties: { title: { type: "string", description: "One-line title" } },
          },
          claim,
          scope: "Added",
        },
        (input) => {
          titles.push((input.value as { title: string }).title);
          return { name: `task-${titles.length}` };
        },
      ),
      list_tasks: edge(
        {
          operation: { input: LIST, output: OUT },
          inputSchema: { description: "List tasks", type: "object", properties: {} },
          claim,
          scope: "Listed",
        },
        () => ({ titles: [...titles] }),
      ),
    },
  };
}

function scripted(turns: ModelTurn[]) {
  const seen = { instructions: "", tools: [] as ToolSpec[], sent: [] as string[], answers: [] as ToolResult[][] };
  const model: Model = {
    start(options) {
      seen.instructions = options.instructions;
      seen.tools = [...options.tools];
      let next = 0;
      return {
        async send(text) {
          seen.sent.push(text);
          return turns[next++]!;
        },
        async answer(results) {
          seen.answers.push([...results]);
          return turns[next++]!;
        },
      };
    },
  };
  return { model, seen };
}
const call = (id: string, name: string, input: unknown): ModelTurn => ({
  text: "",
  toolCalls: [{ id, name, input }],
  stop: "tool_use",
});
const done = (text: string): ModelTurn => ({ text, toolCalls: [], stop: "end_turn" });
const prompt = (text: string) =>
  artifact(ACP_PROMPT, { sessionId: "s1", prompt: [{ type: "text", text }] });
// An identity edge whose input schema is the turn schema, to check conformance.
const conforms = edge(
  { operation: { input: ACP_TURN, output: ACP_TURN }, inputSchema: ACP_TURN_SCHEMA, claim, scope: "Checked" },
  (input) => input.value,
);

describe("agent", () => {
  test("runs the model's tool calls through the toolbox and reports them as ACP updates", async () => {
    const app = tasks();
    const { model, seen } = scripted([
      call("c1", "list_tasks", {}),
      call("c2", "add_task", { title: "Renew the domain" }),
      done("Added one task."),
    ]);
    const result = await invoke(
      agent({ instructions: "Turn notes into tasks.", tools: app.tools, model }),
      prompt("I keep forgetting to renew the domain"),
    );
    const turn = result.artifact.value as unknown as Turn;
    expect(app.titles).toEqual(["Renew the domain"]);
    expect(seen.instructions).toBe("Turn notes into tasks.");
    expect(seen.tools.map((t) => [t.name, t.description])).toEqual([
      ["add_task", "Add a task"],
      ["list_tasks", "List tasks"],
    ]);
    expect(seen.sent).toEqual(["I keep forgetting to renew the domain"]);
    expect(seen.answers).toEqual([
      [{ id: "c1", output: '{"titles":[]}', isError: false }],
      [{ id: "c2", output: '{"name":"task-1"}', isError: false }],
    ]);
    expect(turn.notifications.map((n) => [n.update.sessionUpdate, "status" in n.update ? n.update.status : null])).toEqual([
      ["tool_call", "in_progress"],
      ["tool_call_update", "completed"],
      ["tool_call", "in_progress"],
      ["tool_call_update", "completed"],
      ["agent_message_chunk", null],
    ]);
    expect(turn.notifications.every((n) => n.sessionId === "s1")).toBe(true);
    expect(turn.response).toEqual({ stopReason: "end_turn" });
    expect((await invoke(conforms, result.artifact)).artifact).toEqual(result.artifact);
  });

  test("reports refused calls as failed and lets the model carry on", async () => {
    const app = tasks();
    const { model, seen } = scripted([
      { text: "", toolCalls: [{ id: "a", name: "open_slice", input: {} }, { id: "b", name: "add_task", input: {} }], stop: "tool_use" },
      done("Couldn't."),
    ]);
    const result = await invoke(agent({ instructions: "x", tools: app.tools, model }), prompt("go"));
    expect(app.titles).toEqual([]);
    expect(seen.answers[0]).toEqual([
      { id: "a", output: "No tool named open_slice", isError: true },
      { id: "b", output: "Missing field: title", isError: true },
    ]);
    const turn = result.artifact.value as unknown as Turn;
    expect(turn.notifications.filter((n) => n.update.sessionUpdate === "tool_call_update").map((n) => (n.update as { status: string }).status)).toEqual(["failed", "failed"]);
    expect((await invoke(conforms, result.artifact)).artifact).toEqual(result.artifact);
  });

  test("ends with ACP stop reasons for limits and refusals", async () => {
    const forever = scripted(Array.from({ length: 10 }, (_, i) => call(`c${i}`, "list_tasks", {})));
    const looped = await invoke(agent({ instructions: "x", tools: tasks().tools, model: forever.model, maxTurns: 3 }), prompt("go"));
    expect((looped.artifact.value as unknown as Turn).response).toEqual({ stopReason: "max_turn_requests" });
    const refused = scripted([{ text: "", toolCalls: [], stop: "refusal" }]);
    const result = await invoke(agent({ instructions: "x", tools: tasks().tools, model: refused.model }), prompt("go"));
    expect((result.artifact.value as unknown as Turn).response).toEqual({ stopReason: "refusal" });
  });

  test("refuses prompts and toolboxes it can't honour", async () => {
    const { model } = scripted([done("hi")]);
    const image = artifact(ACP_PROMPT, { sessionId: "s", prompt: [{ type: "image", data: "AA==", mimeType: "image/png" }] });
    await expect(invoke(agent({ instructions: "x", tools: tasks().tools, model }), image)).rejects.toThrow("text prompts only");
    await expect(invoke(agent({ instructions: "x", tools: tasks().tools, model }), artifact(ACP_PROMPT, { prompt: [] }))).rejects.toThrow("Missing field: sessionId");
    expect(() => toolSpecs({ "Add-Task": tasks().tools.add_task })).toThrow("Tool names");
    const bare = edge({ operation: { input: ADD, output: OUT }, inputSchema: { type: "object" }, claim, scope: "x" }, () => ({}));
    expect(() => toolSpecs({ bare })).toThrow("needs a description");
  });

  test("text, then an ACP prompt, then the agent, as one path", async () => {
    const app = tasks();
    const { model } = scripted([call("c1", "add_task", { title: "Ship it" }), done("Done.")]);
    const tell = path(textPrompt("Tell the agent"), agent({ instructions: "x", tools: app.tools, model }));
    expect(tell.inputSchema).toMatchObject({ description: "Tell the agent", required: ["text"] });
    const { TEXT } = await import("./index.js");
    const result = await invoke(tell, artifact(TEXT, { text: "ship it please" }));
    expect(app.titles).toEqual(["Ship it"]);
    expect((result.artifact.value as unknown as Turn).response.stopReason).toBe("end_turn");
    expect(result.claims[0]!.verdict).toBe("passed");
  });
});
