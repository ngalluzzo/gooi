import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sqlite } from "./index.js";

test("opens a database with a caller-supplied schema", () => {
  const directory = mkdtempSync(join(tmpdir(), "gooi-sqlite-"));
  try {
    const file = join(directory, "colors.sqlite");
    sqlite(file)((db) => {
      db.exec("CREATE TABLE colors (name TEXT NOT NULL)");
      db.query("INSERT INTO colors VALUES (?)").run("blue");
    });
    const reopened = sqlite(file);
    expect(reopened((db) => db.query("SELECT name FROM colors").all())).toEqual([{ name: "blue" }]);
    expect(reopened((db) => db.query("SELECT name FROM sqlite_schema WHERE type = 'table'").all()))
      .toEqual([{ name: "colors" }]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
