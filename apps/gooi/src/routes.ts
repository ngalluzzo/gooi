import type { Routes } from "@gooi/hono";
import { printHtml } from "@gooi/hast";
import { reactPage } from "@gooi/react";
import { renderTasks } from "@gooi/tasks/page";
import { commands } from "./commands.js";
import { render } from "./shadcn.js";
import { stylesheet } from "./styles.js";

const list = commands.task.commands.list;

/** gooi's web routes, each a path of edges. Change this, then run `bun run compile`. */
export const routes = {
  page: { path: "/", steps: [list, renderTasks, printHtml] },
  shadcn: { path: "/shadcn", steps: [list, renderTasks, reactPage(render)] },
  styles: { path: "/shadcn.css", steps: [stylesheet] },
} satisfies Routes;
