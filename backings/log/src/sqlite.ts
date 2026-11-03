import type { Database } from "bun:sqlite";
import { fileURLToPath } from "node:url";
import { and, asc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { edge } from "@gooi/exchange";
import type { Value } from "@gooi/kernel/types";
import type { Sqlite } from "@gooi/sqlite";
import {
  appendSpec, listSpec, LogConflict, readSpec, type AppendRequest, type Log, type ReadRequest,
} from "./index.js";
import { entries, streams } from "./sqlite-tables.js";

const migrations = readMigrationFiles({
  migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
});

/** Apply drizzle-kit's migrations, recording the count in SQLite's user_version.
 * Drizzle's own migrate() checks what was applied before taking the write lock,
 * so two processes opening a new file would both create the tables. */
function migrate(db: Database) {
  const applied = () => db.query<{ user_version: number }, []>("PRAGMA user_version").get()!.user_version;
  if (applied() === migrations.length) return;
  db.transaction(() => {
    const from = applied();
    if (from > migrations.length) throw new Error("The log database is newer than this code");
    for (const migration of migrations.slice(from))
      for (const statement of migration.sql) db.run(statement);
    db.run(`PRAGMA user_version = ${migrations.length}`);
  }).immediate();
}

/** Lower the log edges to SQLite tables with Drizzle's typed queries. */
export function sqliteLog(use: Sqlite): Log {
  let migrated = false;
  const withLog: Sqlite = (run) => use((db) => {
    if (!migrated) migrate(db);
    migrated = true;
    return run(db);
  });
  return {
    append: edge(appendSpec, (input) => {
      const { stream, expectedLength, entries: batch } = input.value as unknown as AppendRequest;
      return withLog((db) => db.transaction(() => {
        const orm = drizzle(db);
        const current = orm.select({ length: streams.length }).from(streams)
          .where(eq(streams.stream, stream)).get()?.length ?? 0;
        if (current !== expectedLength) throw new LogConflict(stream, expectedLength, current);

        const length = current + batch.length;
        const updated = new Date().toISOString();
        orm.insert(streams).values({ stream, length, updated })
          .onConflictDoUpdate({ target: streams.stream, set: { length, updated } }).run();
        orm.insert(entries).values(batch.map((entry, index) => ({
          stream, position: current + index, value: JSON.stringify(entry),
        }))).run();
        return { stream, length };
      }).immediate());
    }),
    read: edge(readSpec, (input) => {
      const { stream, from = 0, limit = -1 } = input.value as unknown as ReadRequest;
      const rows = withLog((db) => drizzle(db).select({ value: entries.value }).from(entries)
        .where(and(eq(entries.stream, stream), gte(entries.position, from)))
        .orderBy(asc(entries.position)).limit(limit).all());
      return rows.map((row) => JSON.parse(row.value) as Value);
    }),
    list: edge(listSpec, () => withLog((db) =>
      drizzle(db).select().from(streams).orderBy(asc(streams.stream)).all(),
    )),
  };
}
