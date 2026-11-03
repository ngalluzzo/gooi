import type { Database } from "bun:sqlite";
import type { Sqlite } from "@gooi/sqlite";
import { edge } from "@gooi/exchange";
import type { Value } from "@gooi/kernel/types";
import {
  appendSpec, listSpec, LogConflict, readSpec,
  type AppendRequest, type Log, type ReadRequest, type StreamInfo,
} from "./index.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS streams (
    stream TEXT PRIMARY KEY,
    length INTEGER NOT NULL,
    updated TEXT NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS entries (
    stream TEXT NOT NULL REFERENCES streams(stream),
    position INTEGER NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (stream, position)
  ) STRICT;
`;

/** Lower the log contract to this schema and its SQLite transactions. */
export function sqliteLog(use: Sqlite): Log {
  function withDatabase<T>(run: (db: Database) => T): T {
    return use((db) => {
      db.exec(SCHEMA);
      return run(db);
    });
  }

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
    read: edge(readSpec, (input) => {
      const { stream, from = 0, limit = -1 } = input.value as unknown as ReadRequest;
      return withDatabase((db) => db.query<{ value: string }, [string, number, number]>(`
        SELECT value FROM entries WHERE stream = ? AND position >= ? ORDER BY position LIMIT ?
      `).all(stream, from, limit).map(({ value }) => JSON.parse(value) as Value));
    }),
    list: edge(listSpec, () => withDatabase((db) =>
      db.query<StreamInfo, []>("SELECT stream, length, updated FROM streams ORDER BY stream").all(),
    )),
  };
}
