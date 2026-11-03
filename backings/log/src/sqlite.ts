import type { Sqlite } from "@gooi/sqlite";
import { edge } from "@gooi/exchange";
import {
  appendSpec, listSpec, LogConflict,
  type AppendRequest, type Log, type StreamInfo,
} from "./index.js";
import { sqliteRead, sqliteReadLowering } from "./sqlite-read.js";
import { logDatabase } from "./sqlite-schema.js";

const READ_SQL = "SELECT value FROM entries WHERE stream = ? AND position >= ? ORDER BY position LIMIT ?";

export const lowerRead = sqliteReadLowering(({ stream, from = 0, limit = -1 }) => ({
  sql: READ_SQL, params: [stream, from, limit],
}));

/** Lower the log contract to this schema and its SQLite transactions. */
export function sqliteLog(use: Sqlite): Log {
  const withDatabase = logDatabase(use);

  return {
    append: edge(appendSpec, (input) => {
      const { stream, expectedLength, entries } = input.value as unknown as AppendRequest;
      return withDatabase((db) => db.transaction(() => {
        const current = db.query<{ length: number }, [string]>(
          "SELECT length FROM streams WHERE stream = ?",
        ).get(stream)?.length ?? 0;
        if (current !== expectedLength) throw new LogConflict(stream, expectedLength, current);

        const length = current + entries.length;
        db.query(`
          INSERT INTO streams (stream, length, updated) VALUES (?, ?, ?)
          ON CONFLICT (stream) DO UPDATE SET length = excluded.length, updated = excluded.updated
        `).run(stream, length, new Date().toISOString());
        const insert = db.query("INSERT INTO entries (stream, position, value) VALUES (?, ?, ?)");
        entries.forEach((entry, index) => insert.run(stream, current + index, JSON.stringify(entry)));
        return { stream, length };
      }).immediate());
    }),
    read: sqliteRead(withDatabase, READ_SQL, lowerRead),
    list: edge(listSpec, () => withDatabase((db) =>
      db.query<StreamInfo, []>("SELECT stream, length, updated FROM streams ORDER BY stream").all(),
    )),
  };
}
