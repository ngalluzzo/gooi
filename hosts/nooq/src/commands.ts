import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Layout } from "@gooi/commander";
import { localUser, logs, models } from "@gooi/host-kit";
import { rooms, userId } from "@gooi/room";
import { tasks } from "@gooi/tasks";
import { readOnlyTools, toolbox } from "@gooi/tasks/agent";
import { fileFolder } from "@gooi/tasks/file";

// NOOQ_ROOT points at the nooq checkout; by default it sits next to this repo.
// nooq's tasks are files in it, and its room and agent logs stay in its .gooi.
const root = resolve(process.env.NOOQ_ROOT ?? fileURLToPath(new URL("../../../../nooq", import.meta.url)));
const task = tasks(fileFolder(join(root, "tasks")));
const logAt = logs(join(root, ".gooi"));

// Both backings answer in nooq's room, and the tools they get are nooq's tasks.
const room = rooms({
  log: logAt("rooms"),
  runs: logAt("room-runs"),
  sessions: logAt("agent-sessions"),
  owner: userId(localUser()),
  agents: Object.fromEntries(Object.entries(models()).map(([name, model]) => [
    name,
    { model: model(), tools: toolbox(task), readOnly: readOnlyTools },
  ])),
});

/** How nooq's edges appear as commands. Change this, then run `bun run compile`. */
export const commands = {
  task: {
    description: "Track nooq's tasks as Markdown files in its tasks/ folder",
    commands: { list: task.tasks, add: task.add, finish: task.finish },
  },
  room: {
    description: "Talk nooq's work through with agents; @claude or @omlx mentions one, @room mentions all",
    commands: {
      say: { edge: room.say, output: "text" },
      show: { edge: room.show, output: "text" },
      replay: { edge: room.replay, output: "text" },
    },
  },
} satisfies Layout;
