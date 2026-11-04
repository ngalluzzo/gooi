import { expect, test } from "bun:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { edge } from "@gooi/exchange";
import { mcpServer, tools, type Layout } from "./index.js";

const IN = { id: "urn:test:in", version: 1 };
const OUT = { id: "urn:test:out", version: 1 };
const greet = edge({
  operation: { input: IN, output: OUT },
  inputSchema: {
    type: "object",
    description: "Greet someone by name",
    properties: { name: { type: "string", minLength: 1 } },
    required: ["name"],
    additionalProperties: false,
  },
  claim: { id: "urn:test:greeted", version: 1 },
  scope: "Greeted",
}, (input) => ({ greeting: `hi ${(input.value as { name: string }).name}` }));
const shout = edge({
  operation: { input: IN, output: OUT },
  inputSchema: { type: "object", description: "Shout a word", properties: { word: { type: "string" } }, additionalProperties: false },
  claim: { id: "urn:test:shouted", version: 1 },
  scope: "Shouted",
}, (input) => `${(input.value as { word?: string }).word ?? "hey"}!`.toUpperCase());

const layout: Layout = {
  people: { description: "People", commands: { greet, shout: { edge: shout, output: "text" } } },
};

async function connect(served: Layout, readOnly?: readonly string[]) {
  const [client, server] = InMemoryTransport.createLinkedPair();
  await mcpServer(served, { name: "test", version: "0.0.0", ...(readOnly ? { readOnly } : {}) }).connect(server);
  const mcp = new Client({ name: "test-client", version: "0.0.0" });
  await mcp.connect(client);
  return mcp;
}

test("each command becomes a tool named by its path, with its edge's own schema", async () => {
  const mcp = await connect(layout);
  const { tools: listed } = await mcp.listTools();
  expect(listed.map((tool) => [tool.name, tool.description])).toEqual([
    ["people_greet", "Greet someone by name"],
    ["people_shout", "Shout a word"],
  ]);
  expect(listed[0]!.inputSchema).toMatchObject({ required: ["name"], additionalProperties: false });
});

test("calls run the edge through invoke; text commands answer in text, others in JSON", async () => {
  const mcp = await connect(layout);
  const greeted = await mcp.callTool({ name: "people_greet", arguments: { name: "ana" } });
  expect(greeted.isError).toBeFalsy();
  expect(JSON.parse((greeted.content as { text: string }[])[0]!.text)).toEqual({ greeting: "hi ana" });
  const shouted = await mcp.callTool({ name: "people_shout", arguments: { word: "go" } });
  expect((shouted.content as { text: string }[])[0]!.text).toBe("GO!");
});

test("invalid arguments, failing edges and unknown tools come back as tool errors", async () => {
  const mcp = await connect(layout);
  const missing = await mcp.callTool({ name: "people_greet", arguments: {} });
  expect(missing).toMatchObject({ isError: true, content: [{ type: "text", text: "Missing field: name" }] });
  const extra = await mcp.callTool({ name: "people_greet", arguments: { name: "a", age: 3 } });
  expect(extra).toMatchObject({ isError: true, content: [{ text: "Unexpected field: age" }] });
  const unknown = await mcp.callTool({ name: "people_wave", arguments: {} });
  expect(unknown).toMatchObject({ isError: true, content: [{ text: "No tool named people_wave" }] });
});

test("tools the host says only read carry MCP's readOnlyHint, and the rest don't", async () => {
  const { tools: listed } = await (await connect(layout, ["people_greet"])).listTools();
  expect(listed.map((tool) => [tool.name, tool.annotations?.readOnlyHint])).toEqual([
    ["people_greet", true],
    ["people_shout", undefined],
  ]);
  expect(() => mcpServer(layout, { name: "test", version: "0.0.0", readOnly: ["people_wave"] })).toThrow(
    "No tool named people_wave to mark read-only",
  );
});

test("a layout that can't become tools is refused before serving", () => {
  expect(() => tools({ Bad: greet })).toThrow('Command names are lowercase letters and digits: "Bad"');
  const bare = edge({ operation: { input: IN, output: OUT }, claim: { id: "urn:test:c", version: 1 }, scope: "s" }, () => 1);
  expect(() => tools({ group: { description: "g", commands: { bare } } })).toThrow(
    "group bare: MCP tools need an object input schema",
  );
});
