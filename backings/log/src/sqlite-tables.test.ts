import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { text } from "drizzle-orm/sqlite-core";
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from "drizzle-kit/api";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { sqlite } from "@gooi/sqlite";
import { LOG_READ } from "./index.js";
import { sqliteLog } from "./sqlite.js";
import * as tables from "./sqlite-tables.js";

const read = (file: string) => JSON.parse(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));

test("the generated migrations match the tables (run bun run migrations after changing them)", async () => {
  const journal = read("meta/_journal.json") as { entries: { idx: number }[] };
  const last = String(journal.entries.at(-1)!.idx).padStart(4, "0");
  const generated = read(`meta/${last}_snapshot.json`);
  expect(await generateSQLiteMigration(generated, await generateSQLiteDrizzleJson(tables))).toEqual([]);

  // The check can fail: a column the migrations lack shows up as a statement.
  const { sqliteTable, integer } = await import("drizzle-orm/sqlite-core");
  const changed = sqliteTable("streams", {
    stream: text().primaryKey(), length: integer().notNull(), updated: text().notNull(), title: text(),
  });
  expect(await generateSQLiteMigration(generated, await generateSQLiteDrizzleJson({ ...tables, streams: changed })))
    .toEqual(["ALTER TABLE `streams` ADD `title` text;"]);
});

test("a database from newer code is refused, not downgraded", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gooi-log-version-"));
  try {
    const file = join(dir, "log");
    sqlite(file)((db) => db.run("PRAGMA user_version = 99"));
    await expect(invoke(sqliteLog(sqlite(file)).read, artifact(LOG_READ, { stream: "s" })))
      .rejects.toThrow("The log database is newer than this code");
    expect(sqlite(file)((db) => db.query<{ user_version: number }, []>("PRAGMA user_version").get()!.user_version))
      .toBe(99);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
