import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { agent, sessionHistory, textPrompt } from "@gooi/agent";
import type { Layout } from "@gooi/commander";
import { path } from "@gooi/exchange";
import { choose, localUser, logs, models } from "@gooi/host-kit";
import { rooms, userId } from "@gooi/room";
import { slices } from "@gooi/slices";
import { fileStore } from "@gooi/slices/file";
import { tasks } from "@gooi/tasks";
import { instructions, readOnlyTools, toolbox } from "@gooi/tasks/agent";
import { fileFolder } from "@gooi/tasks/file";
import { tasksTable } from "@gooi/tasks/table";
import { duckdb } from "@gooi/duckdb";
import { issues } from "@gooi/github";
import { work } from "@gooi/work";
import { pages } from "@gooi/pages";
import { searxng } from "@gooi/searxng";
import { web } from "@gooi/web";

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

// The web through the SearXNG on 127.0.0.1:8888, or SEARXNG_URL: searches and
// page reads as edges, and the web as a relation queries can name.
const searx = searxng({ url: process.env.SEARXNG_URL ?? "http://127.0.0.1:8888" });
export const internet = web({ search: searx.search, pages: pages() });

// In a room every backing takes part at once, each under its own Matrix name.
// The owner is the local user. Each answer's run is recorded, and its ACP
// session is saved with the other agent sessions.
const room = rooms({
  log: logAt("rooms"),
  runs: logAt("room-runs"),
  sessions: log,
  owner: userId(localUser()),
  agents: Object.fromEntries(Object.entries(backings).map(([name, model]) => [
    name,
    {
      model: model(),
      tools: { ...toolbox(task), web_search: internet.search, web_read: internet.read },
      readOnly: [...readOnlyTools, "web_search", "web_read"],
    },
  ])),
});

// All of gooi's work in one query: its Markdown tasks as a table, and its
// GitHub issues as a relation DuckDB pushes filters down to. GOOI_REPO names the
// repository; GITHUB_TOKEN is read when a query runs, and public repositories
// work without it. GITHUB_API_URL points it at another API, such as a test's.

export const workspace = work({
  engine: duckdb(),
  tasks: path(task.tasks, tasksTable),
  issues: issues({
    repo: process.env.GOOI_REPO ?? "ngalluzzo/gooi",
    token: () => process.env.GITHUB_TOKEN,
    ...(process.env.GITHUB_API_URL ? { baseUrl: process.env.GITHUB_API_URL } : {}),
  }),
  relations: { web: searx.web },
  project: "gooi",
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
      replay: { edge: room.replay, output: "text" },
    },
  },
  work: {
    description: "gooi's tasks and GitHub issues in one query, as Markdown tables",
    commands: {
      all: { edge: path(workspace.all, workspace.markdown), output: "text" },
      open: { edge: path(workspace.open, workspace.markdown), output: "text" },
      query: { edge: path(workspace.query, workspace.markdown), output: "text" },
    },
  },
  web: {
    description: "Search the web through SearXNG and read pages as Markdown",
    commands: {
      search: { edge: path(internet.search, workspace.markdown), output: "text" },
      read: { edge: internet.read, output: "text" },
    },
  },
} satisfies Layout;
