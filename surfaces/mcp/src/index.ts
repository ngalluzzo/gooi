import { Server } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { invoke, type Implementation } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import type { Value } from "@gooi/kernel/types";

// The layout a host already writes for its commands: names mapped to edges,
// text commands or groups. It's the same shape the Commander surface reads,
// typed structurally here so neither surface depends on the other.
export interface Group {
  readonly description: string;
  readonly commands: Layout;
}
export interface TextCommand {
  readonly edge: Implementation;
  readonly output: "text";
}
export type Layout = { readonly [name: string]: Implementation | TextCommand | Group };

export interface Info {
  readonly name: string;
  readonly version: string;
  /** Tools that only read, marked with MCP's readOnlyHint: the same distinction
   * as Smithy's readonly trait and HTTP's safe methods. Every other tool keeps
   * MCP's default, which a client treats as able to change things. */
  readonly readOnly?: readonly string[];
}

interface Tool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Value;
  readonly edge: Implementation;
  readonly text: boolean;
}

const NAME = /^[a-z][a-z0-9]*$/u;
const isGroup = (entry: Layout[string]): entry is Group => "commands" in entry;
const isText = (entry: Layout[string]): entry is TextCommand => "edge" in entry;

/** Every command in the layout as one tool, named by its path: task list is task_list. */
export function tools(layout: Layout, path: readonly string[] = []): Tool[] {
  return Object.entries(layout).flatMap(([name, entry]): Tool[] => {
    if (!NAME.test(name)) throw new Error(`Command names are lowercase letters and digits: "${name}"`);
    const at = [...path, name];
    if (isGroup(entry)) return tools(entry.commands, at);
    const edge = isText(entry) ? entry.edge : entry;
    const schema = edge.inputSchema as { type?: unknown; description?: unknown } | undefined;
    if (schema?.type !== "object") throw new Error(`${at.join(" ")}: MCP tools need an object input schema`);
    return [{
      name: at.join("_"),
      description: typeof schema.description === "string" ? schema.description : at.join(" "),
      inputSchema: edge.inputSchema!,
      edge,
      text: isText(entry),
    }];
  });
}

/** An MCP server whose tools are the layout's edges. Tools come from each edge's
 * own JSON Schema, read once here; nothing is generated. Calls go through
 * invoke, which checks the arguments against that schema before the edge runs. */
export function mcpServer(layout: Layout, info: Info): Server {
  const listed = tools(layout);
  const byName = new Map(listed.map((tool) => [tool.name, tool]));
  if (byName.size !== listed.length) throw new Error("Two commands lower to the same tool name");
  const readOnly = new Set(info.readOnly ?? []);
  for (const name of readOnly) if (!byName.has(name)) throw new Error(`No tool named ${name} to mark read-only`);
  const server = new Server({ name: info.name, version: info.version }, { capabilities: { tools: {} } });
  server.setRequestHandler("tools/list", () => ({
    tools: listed.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema: inputSchema as { type: "object" },
      ...(readOnly.has(name) ? { annotations: { readOnlyHint: true } } : {}),
    })),
  }));
  server.setRequestHandler("tools/call", async (request) => {
    const tool = byName.get(request.params.name);
    if (!tool) return failed(`No tool named ${request.params.name}`);
    try {
      const { artifact: result } = await invoke(
        tool.edge, artifact(tool.edge.operation.input, (request.params.arguments ?? {}) as Value));
      const text = tool.text && typeof result.value === "string" ? result.value : JSON.stringify(result.value, null, 2);
      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return failed(error instanceof Error ? error.message : String(error));
    }
  });
  return server;
}

/** Serve the layout over stdio. Stdout carries the protocol, so edges must not print to it. */
export async function serveStdio(layout: Layout, info: Info): Promise<Server> {
  const server = mcpServer(layout, info);
  await server.connect(new StdioServerTransport());
  return server;
}

function failed(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}
