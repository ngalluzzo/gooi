import { edge, invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import type { Sqlite } from "@gooi/sqlite";
import {
  lowerSelect, lowerTransaction, SQLITE_SELECT, SQLITE_TRANSACTION,
  type SQLiteSelect, type SQLiteTransaction,
} from "@gooi/sqlite/drizzle";
import { bindQuery, type SQLiteQueryTemplate } from "@gooi/sqlite/query";
import {
  SQLITE_TRANSACTION_INPUT, sqliteTransaction,
  type SQLiteTransactionResult, type SQLiteTransactionTemplate,
} from "@gooi/sqlite/transaction";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  appendSpec, listSpec, LogConflict, type AppendRequest, type Log,
} from "./index.js";
import { sqliteRead, sqliteReadLowering } from "./sqlite-read.js";
import { logDatabase } from "./sqlite-schema.js";

// Typed query definitions for the shared DDL in sqlite-schema.ts.
const streams = sqliteTable("streams", {
  stream: text().notNull(),
  length: integer().notNull(),
  updated: text().notNull(),
});
export const appendLayout = artifact(SQLITE_TRANSACTION, {
  check: {
    select: {
      table: "streams",
      columns: ["length"],
      where: [{ column: "stream", op: "eq", parameter: "stream" }],
    },
    expected: "expectedLength",
    whenMissing: 0,
  },
  writes: [
    {
      table: "streams",
      columns: ["stream", "length", "updated"],
      timestamp: "updated",
      onConflict: { target: "stream", update: ["length", "updated"] },
    },
    {
      table: "entries",
      columns: ["stream", "position", "value"],
      each: { source: "entries", json: "value", index: "position", startAt: "expectedLength" },
    },
  ],
} satisfies SQLiteTransaction);
export const appendCompilation = await invoke(lowerTransaction, appendLayout);
const appendTemplate = appendCompilation.artifact.value as unknown as SQLiteTransactionTemplate;

export const readLayout = artifact(SQLITE_SELECT, {
  table: "entries",
  columns: ["value"],
  where: [
    { column: "stream", op: "eq", parameter: "stream" },
    { column: "position", op: "gte", parameter: "from" },
  ],
  orderBy: "position",
  limit: "limit",
} satisfies SQLiteSelect);
export const readCompilation = await invoke(lowerSelect, readLayout);
const readTemplate = readCompilation.artifact.value as unknown as SQLiteQueryTemplate;

export const lowerRead = sqliteReadLowering(({ stream, from = 0, limit = -1 }) =>
  bindQuery(readTemplate, { stream, from, limit }));

/** Lower the log edges to Drizzle queries over the existing SQLite binding. */
export function drizzleLog(use: Sqlite): Log {
  const withDatabase = logDatabase(use);
  const executeAppend = sqliteTransaction(withDatabase, appendTemplate);
  return {
    append: edge(appendSpec, async (input) => {
      const { stream, expectedLength, entries } = input.value as unknown as AppendRequest;
      const length = expectedLength + entries.length;
      const result = await invoke(executeAppend, artifact(SQLITE_TRANSACTION_INPUT, {
        stream, expectedLength, entries, length,
      }));
      const outcome = result.artifact.value as unknown as SQLiteTransactionResult;
      if (!outcome.committed) {
        if (typeof outcome.actual !== "number") throw new Error("Expected a numeric SQLite stream length");
        throw new LogConflict(stream, expectedLength, outcome.actual);
      }
      return { stream, length };
    }),
    read: sqliteRead(withDatabase, readTemplate.sql, lowerRead),
    list: edge(listSpec, () => withDatabase((db) =>
      drizzle(db).select().from(streams).orderBy(streams.stream).all(),
    )),
  };
}
