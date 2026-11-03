import { describe, expect, test } from "bun:test";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import {
  ADD,
  FINISH,
  LIST,
  tasks,
  taskText,
  type Folder,
  type Listing,
} from "./index.js";

function memory(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial));
  const folder: Folder = {
    names: () => [...files.keys()].sort(),
    read: (name) => {
      const text = files.get(name);
      if (text === undefined) throw new Error(`missing ${name}`);
      return text;
    },
    create: (name, text) => {
      if (files.has(name)) throw new Error("exists");
      files.set(name, text);
    },
    replace: (name, expected, text) => {
      if (files.get(name) !== expected) throw new Error("changed");
      files.set(name, text);
    },
  };
  return { folder, files };
}
const edges = (folder: Folder) => tasks(folder, () => "2026-11-03");
const list = async (folder: Folder) =>
  (await invoke(edges(folder).tasks, artifact(LIST, {}))).artifact
    .value as unknown as Listing;
const add = (folder: Folder, value: object) =>
  invoke(edges(folder).add, artifact(ADD, value));
const finish = (folder: Folder, name: string) =>
  invoke(edges(folder).finish, artifact(FINISH, { name }));

describe("task edges", () => {
  test("add names the file from the title and writes notes below it", async () => {
    const m = memory();
    const result = await add(m.folder, {
      title: "Give edges schemas",
      notes: "Because MCP.",
    });
    expect(result.artifact.value).toEqual({
      name: "give-edges-schemas",
      title: "Give edges schemas",
      status: "open",
      created: "2026-11-03",
    });
    expect(result.claims).toHaveLength(1);
    expect(m.files.get("give-edges-schemas")).toBe(
      taskText("Give edges schemas", "2026-11-03", "Because MCP."),
    );
  });

  test("add refuses a taken name, an unnameable title and a multi-line title", async () => {
    const m = memory();
    await add(m.folder, { title: "Same" });
    await expect(add(m.folder, { title: "Same" })).rejects.toThrow(
      "already exists",
    );
    expect(
      (await add(m.folder, { title: "Same", name: "same-2" })).artifact.value,
    ).toMatchObject({
      name: "same-2",
    });
    await expect(add(m.folder, { title: "🎉" })).rejects.toThrow("give a name");
    await expect(add(m.folder, { title: "a\nb" })).rejects.toThrow("one line");
    await expect(add(m.folder, { title: "x", name: "../up" })).rejects.toThrow(
      "lowercase",
    );
    await expect(add(m.folder, { title: "x", due: "soon" })).rejects.toThrow(
      "Unexpected field: due",
    );
  });

  test("finish takes an exact name or a unique prefix", async () => {
    const m = memory();
    await add(m.folder, { title: "Write docs" });
    await add(m.folder, { title: "Write tests" });
    await expect(finish(m.folder, "write")).rejects.toThrow(
      "write matches several tasks: write-docs, write-tests",
    );
    await expect(finish(m.folder, "nope")).rejects.toThrow(
      "No task named nope",
    );
    const done = await finish(m.folder, "write-t");
    expect(done.artifact.value).toMatchObject({
      name: "write-tests",
      status: "done",
      finished: "2026-11-03",
    });
    await expect(finish(m.folder, "write-tests")).rejects.toThrow(
      "already done",
    );
  });

  test("list sorts open and done tasks and reports unreadable files", async () => {
    const m = memory({
      older: taskText("Older", "2026-11-01"),
      newer: taskText("Newer", "2026-11-02"),
      broken: "no header",
      "Bad Name": taskText("Bad", "2026-11-01"),
    });
    await finish(m.folder, "older");
    const listing = await list(m.folder);
    expect(listing.open.map((t) => t.name)).toEqual(["newer"]);
    expect(listing.done.map((t) => t.name)).toEqual(["older"]);
    expect(listing.unreadable.map((u) => u.name)).toEqual([
      "Bad Name",
      "broken",
    ]);
    expect(listing.unreadable[1]!.problem).toContain("--- header");
  });

  test("finish refuses to overwrite a file edited in the meantime", async () => {
    const m = memory({ t: taskText("T", "2026-11-01") });
    const racing: Folder = {
      ...m.folder,
      read: (name) => {
        const text = m.folder.read(name);
        m.files.set(name, `${text}edited by hand\n`);
        return text;
      },
    };
    await expect(finish(racing, "t")).rejects.toThrow("changed");
    expect(m.files.get("t")).toContain("status: open");
  });
});
