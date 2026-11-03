import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { artifactId } from "@gooi/kernel/evidence";
import { generate, target } from "./compile.js";

const cli = fileURLToPath(target);
const source = readFileSync(cli, "utf8");

describe("generated gooi.ts", () => {
  test("was generated from the current layout", async () => {
    // Formatting the file is fine; changing commands.ts without `bun run compile` is not.
    const { tree } = await generate();
    expect(source).toContain(`from command tree ${artifactId(tree)}.`);
  });

  test("doesn't use gooi's generic CLI", () => {
    expect(source).not.toContain("@gooi/cli");
    const manifest = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    expect(manifest).not.toContain("@gooi/cli");
  });
});

describe("gooi end to end", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "gooi-root-"));
    writeFileSync(
      join(root, "AGENTS.md"),
      "# Page\n\n<!-- gooi:slices:start -->\n<!-- gooi:slices:end -->\n",
    );
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function gooi(...args: string[]) {
    const run = Bun.spawnSync(["bun", cli, ...args], {
      env: { ...process.env, GOOI_ROOT: root },
    });
    const out = run.stdout.toString(),
      err = run.stderr.toString();
    return { code: run.exitCode, out, err, json: () => JSON.parse(out) };
  }

  test("slices and tasks through the compiled commands", () => {
    expect(gooi("slice", "status").json()).toEqual({ open: null, done: [] });
    expect(gooi("slice", "open", "--title", "Try it", "--done", "used").json().open).toEqual({
      number: 1,
      title: "Try it",
      done: "used",
    });
    const again = gooi("slice", "open", "--title", "Two", "--done", "x");
    expect(again.code).toBe(1);
    expect(again.err).toContain("Slice 1 is still open");

    expect(gooi("task", "add", "--title", "First task", "--notes", "Why.").json()).toMatchObject({
      name: "first-task",
      status: "open",
    });
    expect(readFileSync(join(root, "tasks", "first-task.md"), "utf8")).toContain("# First task\n\nWhy.\n");
    expect(gooi("task", "finish", "--name", "first").json()).toMatchObject({ status: "done" });
    expect(gooi("task", "list").json().done[0].name).toBe("first-task");

    gooi("slice", "close", "--used", "the end-to-end test");
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).toContain(
      "- **1. Try it** (closed",
    );
  });

  test("refusals exit nonzero with a readable message", () => {
    const missing = gooi("task", "add");
    expect(missing.code).not.toBe(0);
    expect(missing.err).toContain("required option '--title <title>' not specified");
    const unknown = gooi("task", "finish", "--name", "nope");
    expect(unknown.code).toBe(1);
    expect(unknown.err).toContain("No task named nope");
    const blank = gooi("task", "add", "--title", "   ");
    expect(blank.code).toBe(1);
    expect(blank.err).toContain("Expected title as one line that is not blank");
  });
});
