import { serveStdio } from "@gooi/mcp";
import { commands } from "./commands.js";

// What gooi offers over MCP. An MCP client is an agent, not the owner: it can
// read slices but not open, wait or close them, since slices stay the owner's,
// and it can read and replay rooms but not post in them, which would speak as
// the owner. Run with `bun run mcp`; Claude Code starts it from .mcp.json.
const { slice, task, agent, room } = commands;
await serveStdio({
  slice: { description: slice.description, commands: { status: slice.commands.status } },
  task,
  agent: {
    description: "Read saved agent sessions",
    commands: { sessions: agent.commands.sessions, show: agent.commands.show },
  },
  room: {
    description: "Read and replay rooms; posting stays with the owner",
    commands: { show: room.commands.show, replay: room.commands.replay },
  },
}, { name: "gooi", version: "0.1.0" });
