import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invoke } from "@gooi/exchange";
import { artifact, artifactId } from "@gooi/kernel/evidence";
import type { Trace } from "@gooi/kernel/types";
import { sqlite } from "@gooi/sqlite";
import { SQLITE_QUERY, SQLITE_QUERY_TEMPLATE, SQLITE_ROWS, sqliteQuery, type SQLiteQuery } from "@gooi/sqlite/query";
import { drizzleLog, lowerRead as lowerDrizzle, readCompilation, readLayout } from "./drizzle.js";
import { LOG_APPEND, LOG_ENTRIES, LOG_READ } from "./index.js";
import { sqliteLog, lowerRead as lowerSqlite } from "./sqlite.js";

test("both SQLite read paths lower to an inspectable query and compose the same three hops", async () => {
  const directory = mkdtempSync(join(tmpdir(), "gooi-sqlite-read-"));
  try {
    const use = sqlite(join(directory, "log"));
    const native = sqliteLog(use);
    await invoke(native.append, artifact(LOG_APPEND, {
      stream: "session-42", expectedLength: 0, entries: [false, { n: 1 }, null, { n: 3 }],
    }));
    const request = artifact(LOG_READ, { stream: "session-42", from: 1, limit: 2 });
    expect(readCompilation.artifact.contract).toEqual(SQLITE_QUERY_TEMPLATE);
    expect(readCompilation.artifact.value).toMatchObject({ parameters: ["stream", "from", "limit"] });
    expect(readCompilation.claims[0]!.from[0]!.artifact).toBe(artifactId(readLayout));
    for (const [lower, read] of [[lowerSqlite, native.read], [lowerDrizzle, drizzleLog(use).read]]) {
      const { artifact: query } = await invoke(lower, request);
      expect(query.contract).toEqual(SQLITE_QUERY);
      expect(query.value).toMatchObject({ params: ["session-42", 1, 2] });
      const { sql } = query.value as unknown as SQLiteQuery;
      expect(sql).not.toContain("session-42");

      const result = await invoke(read, request);
      expect(result.artifact).toEqual(artifact(LOG_ENTRIES, [{ n: 1 }, null]));
      const [trace] = result.claims[0]!.witness as unknown as Trace[];
      expect(trace!.verdict).toBe("passed");
      expect(trace!.claims.map((claim) => claim.to[0]!.contract)).toEqual([
        SQLITE_QUERY, SQLITE_ROWS, LOG_ENTRIES,
      ]);
      expect(trace!.claims[0]!.to[0]!.artifact).toBe(artifactId(query));
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("SQLite read plans can't replace the host-bound statement", async () => {
  const use = () => { throw new Error("Unexpected connection"); };
  const read = sqliteQuery(use, "SELECT ? AS value");
  await expect(invoke(read, artifact(SQLITE_QUERY, {
    sql: "DELETE FROM entries", params: [],
  }))).rejects.toThrow("sql must be equal to constant");
});

test("composed reads keep a large result within the existing evidence budget", async () => {
  const directory = mkdtempSync(join(tmpdir(), "gooi-sqlite-read-size-"));
  try {
    const log = drizzleLog(sqlite(join(directory, "log")));
    const value = '"'.repeat(800_000);
    await invoke(log.append, artifact(LOG_APPEND, { stream: "s", expectedLength: 0, entries: [value] }));
    const result = await invoke(log.read, artifact(LOG_READ, { stream: "s" }));
    expect(result.artifact.value).toEqual([value]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
