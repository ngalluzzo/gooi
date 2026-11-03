import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invoke } from "@gooi/exchange";
import { artifact, artifactId } from "@gooi/kernel/evidence";
import type { Trace } from "@gooi/kernel/types";
import { sqlite } from "@gooi/sqlite";
import { SQLITE_QUERY, SQLITE_ROWS, sqliteQuery, type SQLiteQuery } from "@gooi/sqlite/query";
import { LOG_APPEND, LOG_ENTRIES, LOG_READ } from "./index.js";
import { lowerRead, sqliteLog } from "./sqlite.js";

test("a SQLite read lowers to an inspectable query and composes three hops", async () => {
  const directory = mkdtempSync(join(tmpdir(), "gooi-sqlite-read-"));
  try {
    const log = sqliteLog(sqlite(join(directory, "log")));
    await invoke(log.append, artifact(LOG_APPEND, {
      stream: "session-42", expectedLength: 0, entries: [false, { n: 1 }, null, { n: 3 }],
    }));
    const request = artifact(LOG_READ, { stream: "session-42", from: 1, limit: 2 });
    const { artifact: query } = await invoke(lowerRead, request);
    expect(query.contract).toEqual(SQLITE_QUERY);
    expect(query.value).toMatchObject({ params: ["session-42", 1, 2] });
    expect((query.value as unknown as SQLiteQuery).sql).not.toContain("session-42");

    const result = await invoke(log.read, request);
    expect(result.artifact).toEqual(artifact(LOG_ENTRIES, [{ n: 1 }, null]));
    const [trace] = result.claims[0]!.witness as unknown as Trace[];
    expect(trace!.verdict).toBe("passed");
    expect(trace!.claims.map((claim) => claim.to[0]!.contract)).toEqual([
      SQLITE_QUERY, SQLITE_ROWS, LOG_ENTRIES,
    ]);
    expect(trace!.claims[0]!.to[0]!.artifact).toBe(artifactId(query));
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
    const log = sqliteLog(sqlite(join(directory, "log")));
    const value = '"'.repeat(800_000);
    await invoke(log.append, artifact(LOG_APPEND, { stream: "s", expectedLength: 0, entries: [value] }));
    const result = await invoke(log.read, artifact(LOG_READ, { stream: "s" }));
    expect(result.artifact.value).toEqual([value]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
