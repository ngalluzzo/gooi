import { serveStdio } from "@gooi/mcp";
import { commands, docs } from "./commands.js";

// What nooq offers over MCP: its tasks, reading and replaying its rooms, and
// reading documents and proposing suggestions to them. Posting in rooms,
// importing documents and accepting or rejecting suggestions stay with the
// owner. Run with `bun run nooq-mcp`.
const { task, room } = commands;
await serveStdio({
  task,
  doc: {
    description: "Read nooq documents and propose changes as suggestions the owner reviews",
    commands: {
      list: docs.list,
      read: { edge: docs.markdown, output: "text" },
      blocks: docs.blocks,
      suggestions: docs.suggestions,
      propose: docs.propose,
    },
  },
  room: {
    description: "Read and replay nooq's rooms; posting stays with the owner",
    commands: { show: room.commands.show, replay: room.commands.replay },
  },
}, {
  name: "nooq",
  version: "0.1.0",
  readOnly: ["task_list", "room_show", "doc_list", "doc_read", "doc_blocks", "doc_suggestions"],
});
