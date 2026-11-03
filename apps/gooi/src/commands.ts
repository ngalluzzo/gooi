import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { agent, sessionHistory, textPrompt, type Model } from "@gooi/agent";
import { claude } from "@gooi/claude";
import type { Layout } from "@gooi/commander";
import { path } from "@gooi/exchange";
import { jsonl } from "@gooi/jsonl";
import { jsonlLog } from "@gooi/log/jsonl";
import { sqliteLog } from "@gooi/log/sqlite";
import { openaiCompatible } from "@gooi/openai";
import { slices } from "@gooi/slices";
import { fileStore } from "@gooi/slices/file";
import { sqlite } from "@gooi/sqlite";
import { tasks } from "@gooi/tasks";
import { instructions, toolbox } from "@gooi/tasks/agent";
import { fileFolder } from "@gooi/tasks/file";

// GOOI_ROOT points the command at another checkout; by default it's this repo.
const root = process.env.GOOI_ROOT
  ? pathToFileURL(`${resolve(process.env.GOOI_ROOT)}/`)
  : new URL("../../../", import.meta.url);
const file = (relative: string) => fileURLToPath(new URL(relative, root));
const task = tasks(fileFolder(file("tasks")));

// The agent's backing is host wiring: GOOI_AGENT picks it and nothing in the
// app changes. Keys come from the environment (.env) when a turn starts.
const backings: Record<string, () => Model> = {
  claude: () => claude({ apiKey: () => process.env.CLAUDE_API_KEY }),
  omlx: () =>
    openaiCompatible({
      baseURL: process.env.OMLX_BASE_URL ?? "http://127.0.0.1:8000/v1",
      apiKey: () => process.env.OMLX_API_KEY,
      model: process.env.OMLX_MODEL ?? "Qwen3.8-27B-Q8_0",
    }),
};
const backing = process.env.GOOI_AGENT ?? "claude";
if (!Object.hasOwn(backings, backing))
  throw new Error(`GOOI_AGENT must be one of ${Object.keys(backings).join(", ")}; got "${backing}"`);

const sessionDb = sqlite(file(".gooi/agent-sessions.sqlite"));
const stores = {
  jsonl: () => jsonlLog(jsonl(file(".gooi/agent-sessions"))),
  sqlite: () => sqliteLog(sessionDb),
};
const store = process.env.GOOI_STORE ?? "jsonl";
if (!Object.hasOwn(stores, store))
  throw new Error(`GOOI_STORE must be one of ${Object.keys(stores).join(", ")}; got "${store}"`);
const log = stores[store as keyof typeof stores]();
const history = sessionHistory(log, resolve(file(".")));

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
        agent({ instructions, tools: toolbox(task), model: backings[backing]!(), log }),
      ),
      sessions: history.sessions,
      show: { edge: history.show, output: "text" },
    },
  },
} satisfies Layout;
