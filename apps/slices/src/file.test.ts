import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { END, START, fileStore } from "./file.js";
import { EMPTY, readState } from "./index.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gooi-slices-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const state = readState({
  open: { number: 1, title: "First", done: "d" },
  done: [],
});

describe("file store", () => {
  test("treats a missing file as an empty project", () => {
    expect(fileStore(join(dir, "none", "slices.json")).read()).toEqual(EMPTY);
  });

  test("writes JSON and replaces only the marked section of the view", () => {
    const path = join(dir, ".gooi", "slices.json"),
      view = join(dir, "AGENTS.md");
    writeFileSync(
      view,
      `# Title\n\nKeep me.\n\n${START}\nold\n${END}\n\nAfter.\n`,
    );
    const store = fileStore(path, view);
    store.write(state);
    expect(store.read()).toEqual(state);
    const page = readFileSync(view, "utf8");
    expect(page).toStartWith("# Title\n\nKeep me.\n\n");
    expect(page).toContain(`${START}\n## Open slice\n\n**1. First**`);
    expect(page).not.toContain("old");
    expect(page).toEndWith(`_Nothing yet._\n${END}\n\nAfter.\n`);
  });

  test("writes nothing when the view has no marked section", () => {
    const path = join(dir, "slices.json"),
      view = join(dir, "AGENTS.md");
    writeFileSync(view, "# No markers\n");
    expect(() => fileStore(path, view).write(state)).toThrow("Expected one");
    expect(existsSync(path)).toBe(false);
    expect(readFileSync(view, "utf8")).toBe("# No markers\n");
  });

  test("names the file when its contents are invalid", () => {
    const path = join(dir, "slices.json");
    writeFileSync(path, '{"open": null}');
    expect(() => fileStore(path).read()).toThrow(`Invalid slice file ${path}`);
  });
});
