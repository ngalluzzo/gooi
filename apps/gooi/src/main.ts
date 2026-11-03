import { fileURLToPath } from "node:url";
import { cli } from "@gooi/cli";
import { slices } from "@gooi/slices";
import { fileStore } from "@gooi/slices/file";
import { tasks } from "@gooi/tasks";
import { fileFolder } from "@gooi/tasks/file";

// This repo's own command: two apps' edges behind one generic CLI.
const root = new URL("../../../", import.meta.url);
const path = (relative: string) => fileURLToPath(new URL(relative, root));
const apps = [
  slices(fileStore(path(".gooi/slices.json"), path("AGENTS.md"))),
  tasks(fileFolder(path("tasks"))),
];
const edges = Object.assign({}, ...apps);
if (
  Object.keys(edges).length !==
  apps.reduce((n, app) => n + Object.keys(app).length, 0)
)
  throw new Error("Two apps define the same command");
process.exitCode = await cli(edges, process.argv.slice(2), { name: "gooi" });
