import { edge, type Implementation } from "@gooi/exchange";
import type { Value } from "@gooi/kernel/types";
import { TASKS, type Listing } from "./index.js";

/** A Frictionless tabular data resource (Data Package v2), adopted by its ID. */
export const TABLE = Object.freeze({ id: "https://datapackage.org/standard/data-resource/#tabular", version: 2 });

/** The task listing as a table, one row per readable task, so queries can read tasks. */
export const tasksTable: Implementation = edge({
  operation: { input: TASKS, output: TABLE },
  claim: { id: "urn:gooi:tasks:tabled", version: 1 },
  scope: "Turned every readable task into one row with its name, title, status and dates; unreadable files are left out",
}, (input) => {
  const { open, done } = input.value as unknown as Listing;
  return {
    type: "table",
    schema: { fields: [
      { name: "name", type: "string" },
      { name: "title", type: "string" },
      { name: "status", type: "string" },
      { name: "created", type: "date" },
      { name: "finished", type: "date" },
    ] },
    data: [...open, ...done].map((task) => ({
      name: task.name, title: task.title, status: task.status, created: task.created, finished: task.finished ?? null,
    })),
  } as unknown as Value;
});
