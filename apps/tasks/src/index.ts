import { edge } from "@gooi/exchange";
import type { Contract, Value } from "@gooi/kernel/types";
import {
  finishText,
  nameFor,
  readName,
  readTask,
  taskText,
  type Task,
} from "./format.js";

export {
  finishText,
  nameFor,
  readTask,
  taskText,
  type Status,
  type Task,
} from "./format.js";

export const LIST = Object.freeze({ id: "urn:gooi:tasks:list", version: 1 });
export const ADD = Object.freeze({ id: "urn:gooi:tasks:add", version: 1 });
export const FINISH = Object.freeze({
  id: "urn:gooi:tasks:finish",
  version: 1,
});
export const TASKS = Object.freeze({ id: "urn:gooi:tasks:tasks", version: 1 });
export const TASK = Object.freeze({ id: "urn:gooi:tasks:task", version: 1 });
const APPLIED = Object.freeze({ id: "urn:gooi:tasks:applied", version: 1 });
const TITLE_LIMIT = 200;
const NOTES_LIMIT = 20000;

/** Where task files live. The host chooses the folder; edges never pick a path. */
export interface Folder {
  /** Names of the folder's .md files, without the extension. */
  names(): readonly string[];
  read(name: string): string;
  /** Write a new file; refuses if one exists. */
  create(name: string, text: string): void;
  /** Replace a file only if it still holds `expected`. */
  replace(name: string, expected: string, text: string): void;
}
export interface Listing {
  readonly open: readonly Task[];
  readonly done: readonly Task[];
  readonly unreadable: readonly {
    readonly name: string;
    readonly problem: string;
  }[];
}

type Fields = { readonly [key: string]: string | undefined };
const field = (description: string, maxLength: number) => ({
  type: "string",
  minLength: 1,
  maxLength,
  description,
});
const record = (
  description: string,
  properties: Record<string, Value>,
  required: string[] = [],
): Value => ({
  description,
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const LIST_INPUT = record(
  "List open and done tasks, and any files that can't be read",
  {},
);
const ADD_INPUT = record(
  "Add a task as tasks/<name>.md",
  {
    title: field("One-line title", TITLE_LIMIT),
    name: field("File name; made from the title when left out", 80),
    notes: field("Notes written below the title", NOTES_LIMIT),
  },
  ["title"],
);
const FINISH_INPUT = record(
  "Mark a task done, changing only its header",
  { name: field("Task name, or a prefix that matches one task", 80) },
  ["name"],
);

/** Trimmed text that is not blank and, for titles and names, one line. */
function text(value: string, name: string, oneLine: boolean): string {
  if (!value.trim() || (oneLine && value.includes("\n")))
    throw new Error(
      `Expected ${name} as ${oneLine ? "one line" : "text"} that is not blank`,
    );
  return value.trim();
}
function localDate(): string {
  return new Date().toLocaleDateString("en-CA");
}
function step(
  input: Contract,
  output: Contract,
  inputSchema: Value,
  scope: string,
  apply: (request: Fields) => Value,
) {
  return edge(
    { operation: { input, output }, inputSchema, claim: APPLIED, scope },
    (request) => apply(request.value as Fields),
  );
}
/** An exact name, or a prefix that matches exactly one task. */
function resolve(names: readonly string[], wanted: string): string {
  if (names.includes(wanted)) return wanted;
  const matches = names.filter((name) => name.startsWith(wanted));
  if (matches.length === 1) return matches[0]!;
  if (!matches.length) throw new Error(`No task named ${wanted}`);
  throw new Error(`${wanted} matches several tasks: ${matches.join(", ")}`);
}

/** List, add and finish Markdown task files in a host-chosen folder. `today`
 * returns YYYY-MM-DD. */
export function tasks(folder: Folder, today: () => string = localDate) {
  return Object.freeze({
    tasks: step(
      LIST,
      TASKS,
      LIST_INPUT,
      "Read every task file in the folder; excludes later edits",
      () => {
        const open: Task[] = [],
          done: Task[] = [],
          unreadable: { name: string; problem: string }[] = [];
        for (const name of folder.names()) {
          try {
            const task = readTask(name, folder.read(name));
            (task.status === "open" ? open : done).push(task);
          } catch (error) {
            unreadable.push({ name, problem: (error as Error).message });
          }
        }
        open.sort(
          (a, b) =>
            a.created.localeCompare(b.created) || a.name.localeCompare(b.name),
        );
        done.sort(
          (a, b) =>
            (b.finished ?? b.created).localeCompare(a.finished ?? a.created) ||
            a.name.localeCompare(b.name),
        );
        return { open, done, unreadable } satisfies Listing as unknown as Value;
      },
    ),
    add: step(
      ADD,
      TASK,
      ADD_INPUT,
      "Created one task file; excludes later edits",
      (v) => {
        const title = text(v.title!, "title", true);
        const notes =
          v.notes === undefined ? undefined : text(v.notes, "notes", false);
        const name = v.name === undefined ? nameFor(title) : readName(v.name);
        if (!name)
          throw new Error(
            "The title has no letters or digits to name the file; give a name",
          );
        if (folder.names().includes(name))
          throw new Error(`Task ${name} already exists; choose another name`);
        const file = taskText(title, today(), notes);
        const task = readTask(name, file);
        folder.create(name, file);
        return task as unknown as Value;
      },
    ),
    finish: step(
      FINISH,
      TASK,
      FINISH_INPUT,
      "Marked one task done, changing only its header; excludes later edits",
      (v) => {
        const name = resolve(folder.names(), text(v.name!, "name", true));
        const before = folder.read(name);
        const after = finishText(name, before, today());
        folder.replace(name, before, after);
        return readTask(name, after) as unknown as Value;
      },
    ),
  });
}
