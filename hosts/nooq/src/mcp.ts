import { serveStdio } from "@gooi/mcp";
import { commands } from "./commands.js";

// What nooq offers over MCP: its tasks, and reading and replaying its rooms.
// Posting stays with the owner. Run with `bun run nooq-mcp`.
const { task, room } = commands;
await serveStdio({
  task,
  room: {
    description: "Read and replay nooq's rooms; posting stays with the owner",
    commands: { show: room.commands.show, replay: room.commands.replay },
  },
}, { name: "nooq", version: "0.1.0" });
