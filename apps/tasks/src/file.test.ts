import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileFolder } from "./file.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gooi-tasks-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("file folder", () => {
  test("a missing folder has no tasks, and create makes it", () => {
    const folder = fileFolder(join(dir, "tasks"));
    expect(folder.names()).toEqual([]);
    folder.create("first", "one\n");
    expect(folder.names()).toEqual(["first"]);
    expect(folder.read("first")).toBe("one\n");
  });

  test("lists only .md files and never overwrites on create", () => {
    const folder = fileFolder(dir);
    writeFileSync(join(dir, "notes.txt"), "x");
    mkdirSync(join(dir, "sub.md"));
    folder.create("a", "1");
    expect(folder.names()).toEqual(["a"]);
    expect(() => folder.create("a", "2")).toThrow("already exists");
    expect(folder.read("a")).toBe("1");
  });

  test("replace refuses when the file changed since it was read", () => {
    const folder = fileFolder(dir);
    folder.create("a", "before");
    expect(() => folder.replace("a", "something else", "after")).toThrow("changed");
    folder.replace("a", "before", "after");
    expect(readFileSync(join(dir, "a.md"), "utf8")).toBe("after");
  });

  test("refuses names that could leave the folder", () => {
    expect(() => fileFolder(dir).read("../secret")).toThrow("lowercase words");
  });
});
