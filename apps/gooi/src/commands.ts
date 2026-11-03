import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Layout } from "@gooi/commander";
import { slices } from "@gooi/slices";
import { fileStore } from "@gooi/slices/file";
import { tasks } from "@gooi/tasks";
import { fileFolder } from "@gooi/tasks/file";

// GOOI_ROOT points the command at another checkout; by default it's this repo.
const root = process.env.GOOI_ROOT
  ? pathToFileURL(`${resolve(process.env.GOOI_ROOT)}/`)
  : new URL("../../../", import.meta.url);
const path = (relative: string) => fileURLToPath(new URL(relative, root));
const task = tasks(fileFolder(path("tasks")));

/** How gooi's edges appear as commands. Change this, then run `bun run compile`. */
export const commands = {
  slice: {
    description: "Track gooi's slices; only one is open at a time",
    commands: slices(fileStore(path(".gooi/slices.json"), path("AGENTS.md"))),
  },
  task: {
    description: "Track tasks as Markdown files in tasks/",
    commands: { list: task.tasks, add: task.add, finish: task.finish },
  },
} satisfies Layout;
