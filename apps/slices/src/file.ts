import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { EMPTY, readState, render, type State, type Store } from "./index.js";

export const START = "<!-- gooi:slices:start -->";
export const END = "<!-- gooi:slices:end -->";

/** Keep state as JSON at `path`. When `view` is given, mirror it into that
 * Markdown file's one marked section. A missing state file is an empty project. */
export function fileStore(path: string, view?: string): Store {
  return Object.freeze({
    read(): State {
      let raw: string;
      try {
        raw = readFileSync(path, "utf8");
      } catch (error) {
        if ((error as { code?: string }).code === "ENOENT") return EMPTY;
        throw error;
      }
      try {
        return readState(JSON.parse(raw));
      } catch (error) {
        throw new Error(
          `Invalid slice file ${path}: ${(error as Error).message}`,
        );
      }
    },
    write(value: State) {
      const state = readState(value);
      // Check the view before writing anything, so a broken page leaves both files as they were.
      const page =
        view === undefined
          ? undefined
          : section(readFileSync(view, "utf8"), render(state));
      replace(path, `${JSON.stringify(state, null, 2)}\n`);
      if (view !== undefined) replace(view, page!);
    },
  });
}

function section(page: string, body: string): string {
  const start = page.indexOf(START),
    end = page.indexOf(END);
  if (start < 0 || end < start || page.indexOf(START, start + 1) >= 0)
    throw new Error(`Expected one ${START} … ${END} section in the view`);
  // Blank lines around the body match what Markdown formatters produce.
  return `${page.slice(0, start + START.length)}\n\n${body}\n\n${page.slice(end)}`;
}

function replace(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, path);
}
