import { and, eq, gte, Placeholder, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { integer, QueryBuilder, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { edge } from "@gooi/exchange";
import type { Sqlite } from "@gooi/sqlite";
import { bindQuery, type SQLiteQueryTemplate } from "@gooi/sqlite/query";
import { appendSpec, listSpec, LogConflict, type AppendRequest, type Log } from "./index.js";
import { sqliteRead, sqliteReadLowering } from "./sqlite-read.js";
import { logDatabase } from "./sqlite-schema.js";

// Typed definitions for the DDL in sqlite-schema.ts.
const streams = sqliteTable("streams", {
  stream: text().primaryKey(),
  length: integer().notNull(),
  updated: text().notNull(),
});
const entries = sqliteTable("entries", {
  stream: text().notNull(),
  position: integer().notNull(),
  value: text().notNull(),
});

/** Keep a compiled Drizzle query's placeholders as named parameters. */
function template({ sql: statement, params }: { sql: string; params: unknown[] }): SQLiteQueryTemplate {
  return {
    sql: statement,
    parameters: params.map((param) => {
      if (!(param instanceof Placeholder)) throw new Error("Expected only named placeholders");
      return param.name;
    }),
  };
}

// Compiled once at load: the read is trusted SQL, and requests supply values only.
const READ = template(
  new QueryBuilder()
    .select({ value: entries.value })
    .from(entries)
    .where(and(
      eq(entries.stream, sql.placeholder("stream")),
      gte(entries.position, sql.placeholder("from")),
    ))
    .orderBy(entries.position)
    .limit(sql.placeholder("limit"))
    .toSQL(),
);

export const lowerRead = sqliteReadLowering(({ stream, from = 0, limit = -1 }) =>
  bindQuery(READ, { stream, from, limit }));

/** Lower the log edges to SQLite with Drizzle's typed queries. */
export function sqliteLog(use: Sqlite): Log {
  const withDatabase = logDatabase(use);
  return {
    append: edge(appendSpec, (input) => {
      const { stream, expectedLength, entries: batch } = input.value as unknown as AppendRequest;
      return withDatabase((db) => db.transaction(() => {
        const orm = drizzle(db);
        const current = orm.select({ length: streams.length }).from(streams)
          .where(eq(streams.stream, stream)).get()?.length ?? 0;
        if (current !== expectedLength) throw new LogConflict(stream, expectedLength, current);

        const length = current + batch.length;
        const updated = new Date().toISOString();
        orm.insert(streams).values({ stream, length, updated })
          .onConflictDoUpdate({ target: streams.stream, set: { length, updated } }).run();
        batch.forEach((entry, index) => {
          orm.insert(entries)
            .values({ stream, position: current + index, value: JSON.stringify(entry) }).run();
        });
        return { stream, length };
      }).immediate());
    }),
    read: sqliteRead(withDatabase, READ.sql, lowerRead),
    list: edge(listSpec, () => withDatabase((db) =>
      drizzle(db).select().from(streams).orderBy(streams.stream).all(),
    )),
  };
}
