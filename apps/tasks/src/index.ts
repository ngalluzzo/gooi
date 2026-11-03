import { edge } from "@gooi/exchange";
import type { Contract, Value } from "@gooi/kernel/types";
import { finishText, nameFor, readName, readTask, taskText, type Task } from "./format.js";

export { finishText, nameFor, readTask, taskText, type Status, type Task } from "./format.js";

export const LIST = Object.freeze({ id: "urn:gooi:tasks:list", version: 1 });
export const ADD = Object.freeze({ id: "urn:gooi:tasks:add", version: 1 });
export const FINISH = Object.freeze({ id: "urn:gooi:tasks:finish", version: 1 });
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
  readonly unreadable: readonly { readonly name: string; readonly problem: string }[];
}

type Fields = { readonly [key: string]: Value };
function fields(
  value: Value,
  required: readonly string[],
  optional: readonly string[] = [],
): Fields {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a record");
  for (const key of Object.keys(value))
    if (!required.includes(key) && !optional.includes(key))
      throw new Error(`Unexpected field: ${key}`);
  for (const key of required)
    if (!Object.hasOwn(value, key)) throw new Error(`Missing field: ${key}`);
  return value as Fields;
}
function text(value: Value | undefined, name: string, limit: number, oneLine: boolean): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > limit ||
    (oneLine && value.includes("\n"))
  )
    throw new Error(
      `Expected ${name} as ${oneLine ? "one line" : "text"} of 1 to ${limit} characters`,
    );
  return value.trim();
}
function localDate(): string {
  return new Date().toLocaleDateString("en-CA");
}
function step(input: Contract, output: Contract, scope: string, apply: (request: Value) => Value) {
  return edge({ operation: { input, output }, claim: APPLIED, scope }, (request) =>
    apply(request.value),
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
    tasks: step(LIST, TASKS, "Read every task file in the folder; excludes later edits", (request) => {
      fields(request, []);
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
      open.sort((a, b) => a.created.localeCompare(b.created) || a.name.localeCompare(b.name));
      done.sort(
        (a, b) =>
          (b.finished ?? b.created).localeCompare(a.finished ?? a.created) ||
          a.name.localeCompare(b.name),
      );
      return { open, done, unreadable } satisfies Listing as unknown as Value;
    }),
    add: step(ADD, TASK, "Created one task file; excludes later edits", (request) => {
      const v = fields(request, ["title"], ["name", "notes"]);
      const title = text(v.title, "title", TITLE_LIMIT, true);
      const notes = v.notes === undefined ? undefined : text(v.notes, "notes", NOTES_LIMIT, false);
      const name = v.name === undefined ? nameFor(title) : readName(v.name);
      if (!name) throw new Error("The title has no letters or digits to name the file; give a name");
      if (folder.names().includes(name))
        throw new Error(`Task ${name} already exists; choose another name`);
      const file = taskText(title, today(), notes);
      const task = readTask(name, file);
      folder.create(name, file);
      return task as unknown as Value;
    }),
    finish: step(FINISH, TASK, "Marked one task done, changing only its header; excludes later edits", (request) => {
      const v = fields(request, ["name"]);
      const name = resolve(folder.names(), text(v.name, "name", 80, true));
      const before = folder.read(name);
      const after = finishText(name, before, today());
      folder.replace(name, before, after);
      return readTask(name, after) as unknown as Value;
    }),
  });
}
