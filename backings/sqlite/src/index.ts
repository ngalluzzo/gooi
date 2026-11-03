import { Database } from "bun:sqlite";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { dirname } from "node:path";

/** Bind a database file and lend a configured SQLite connection to each
 * synchronous use. The caller supplies the schema and transaction. */
export function sqlite(file: string) {
  return function use<T>(run: (db: Database) => T): T {
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    closeSync(openSync(file, "a", 0o600));
    const db = new Database(file, { strict: true });
    try {
      db.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; PRAGMA synchronous = FULL;");
      return run(db);
    } finally {
      db.close();
    }
  };
}

export type Sqlite = ReturnType<typeof sqlite>;
