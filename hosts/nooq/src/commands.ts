import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Layout } from "@gooi/commander";
import { path } from "@gooi/exchange";
import { localUser, logs, models } from "@gooi/host-kit";
import { documents } from "@gooi/nooq-docs";
import { rooms, userId } from "@gooi/room";
import { tasks } from "@gooi/tasks";
import { readOnlyTools, toolbox } from "@gooi/tasks/agent";
import { fileFolder } from "@gooi/tasks/file";
import { tasksTable } from "@gooi/tasks/table";
import { duckdb } from "@gooi/duckdb";
import { issues } from "@gooi/github";
import { work } from "@gooi/work";

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

// nooq's documents, kept on the log the way nooq's DM-14.6 describes a host.
// Markdown imports read from the nooq checkout. The owner imports, accepts and
// rejects; agents propose, through MCP (see mcp.ts).
export const docs = documents({
  log: logAt("documents"),
  owner: { actorId: `human:${localUser()}`, kind: "human" },
  root,
});

// All of nooq's work in one query: its Markdown tasks as a table, and its
// GitHub issues as a relation DuckDB pushes filters down to. NOOQ_REPO names the
// repository; GITHUB_TOKEN is read when a query runs, and public repositories
// work without it. GITHUB_API_URL points it at another API, such as a test's.
export const workspace = work({
  engine: duckdb(),
  tasks: path(task.tasks, tasksTable),
  issues: issues({
    repo: process.env.NOOQ_REPO ?? "ngalluzzo/nooq",
    token: () => process.env.GITHUB_TOKEN,
    ...(process.env.GITHUB_API_URL ? { baseUrl: process.env.GITHUB_API_URL } : {}),
  }),
  project: "nooq",
});

/** How nooq's edges appear as commands. Change this, then run `bun run compile`. */
export const commands = {
  task: {
    description: "Track nooq's tasks as Markdown files in its tasks/ folder",
    commands: { list: task.tasks, add: task.add, finish: task.finish },
  },
  doc: {
    description: "nooq documents: import Markdown, read, and review agents' suggestions",
    commands: {
      list: docs.list,
      import: docs.import,
      read: { edge: docs.markdown, output: "text" },
      html: { edge: docs.html, output: "text" },
      blocks: docs.blocks,
      suggestions: docs.suggestions,
      accept: docs.accept,
      reject: docs.reject,
    },
  },
  room: {
    description: "Talk nooq's work through with agents; @claude or @omlx mentions one, @room mentions all",
    commands: {
      say: { edge: room.say, output: "text" },
      show: { edge: room.show, output: "text" },
      replay: { edge: room.replay, output: "text" },
    },
  },
  work: {
    description: "nooq's tasks and GitHub issues in one query, as Markdown tables",
    commands: {
      all: { edge: path(workspace.all, workspace.markdown), output: "text" },
      open: { edge: path(workspace.open, workspace.markdown), output: "text" },
      query: { edge: path(workspace.query, workspace.markdown), output: "text" },
    },
  },
} satisfies Layout;
