import type { Sqlite } from "@gooi/sqlite";

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

/** Open the same on-disk log schema for either SQLite mapping. */
export function logDatabase(use: Sqlite): Sqlite {
  return (run) => use((db) => {
    db.exec(SCHEMA);
    return run(db);
  });
}
