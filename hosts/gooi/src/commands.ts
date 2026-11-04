import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { agent, sessionHistory, textPrompt } from "@gooi/agent";
import type { Layout } from "@gooi/commander";
import { path } from "@gooi/exchange";
import { choose, localUser, logs, models } from "@gooi/host-kit";
import { instructions as roomInstructions, rooms, userId } from "@gooi/room";
import { slices } from "@gooi/slices";
import { fileStore } from "@gooi/slices/file";
import { tasks } from "@gooi/tasks";
import { instructions, toolbox } from "@gooi/tasks/agent";
import { fileFolder } from "@gooi/tasks/file";

// GOOI_ROOT points the command at another checkout; by default it's this repo.
const root = process.env.GOOI_ROOT
  ? pathToFileURL(`${resolve(process.env.GOOI_ROOT)}/`)
  : new URL("../../../", import.meta.url);
const file = (relative: string) => fileURLToPath(new URL(relative, root));
const task = tasks(fileFolder(file("tasks")));

// The agent's backing is host wiring: GOOI_AGENT picks it for `agent tell`, and
// nothing in the app changes. GOOI_STORE picks where the logs live.
const backings = models();
const told = choose("GOOI_AGENT", backings, "claude");
const logAt = logs(file(".gooi"));
const log = logAt("agent-sessions");
const history = sessionHistory(log, resolve(file(".")));

// In a room every backing takes part at once, each under its own Matrix name.
// The owner is the local user; their turns are saved like any agent session.
const owner = userId(localUser());
const room = rooms({
  log: logAt("rooms"),
  owner,
  agents: Object.fromEntries(Object.entries(backings).map(([name, model]) => [
    name,
    agent({ instructions: roomInstructions, tools: toolbox(task), model: model(), log }),
  ])),
});

/** How gooi's edges appear as commands. Change this, then run `bun run compile`. */
export const commands = {
  slice: {
    description: "Track gooi's slices; only one is open at a time",
    commands: slices(fileStore(file(".gooi/slices.json"), file("AGENTS.md"))),
  },
  task: {
    description: "Track tasks as Markdown files in tasks/",
    commands: { list: task.tasks, add: task.add, finish: task.finish },
  },
  agent: {
    description: "Hand work to an agent; GOOI_AGENT picks its backing (claude or omlx)",
    commands: {
      tell: path(
        textPrompt("Tell the agent about work to do, in your own words; it adds the tasks"),
        agent({ instructions, tools: toolbox(task), model: told(), log }),
      ),
      sessions: history.sessions,
      show: { edge: history.show, output: "text" },
    },
  },
  room: {
    description: "Talk with agents in a room; @claude or @omlx mentions one, @room mentions all",
    commands: {
      say: { edge: room.say, output: "text" },
      show: { edge: room.show, output: "text" },
    },
  },
} satisfies Layout;
