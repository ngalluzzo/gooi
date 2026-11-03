import type { Routes } from "@gooi/hono";
import { printHtml } from "@gooi/hast";
import { renderTasks } from "@gooi/tasks/page";
import { commands } from "./commands.js";

/** gooi's web routes, each a path of edges. Change this, then run `bun run compile`. */
export const routes = {
  page: {
    path: "/",
    steps: [commands.task.commands.list, renderTasks, printHtml],
  },
} satisfies Routes;
