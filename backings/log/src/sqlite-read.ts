import { edge, path, type Implementation } from "@gooi/exchange";
import type { Value } from "@gooi/kernel/types";
import type { Sqlite } from "@gooi/sqlite";
import { SQLITE_QUERY, SQLITE_ROWS, sqliteQuery, type SQLiteQuery } from "@gooi/sqlite/query";
import { LOG_ENTRIES, LOG_READ, readSpec, type ReadRequest } from "./index.js";

export function sqliteReadLowering(compile: (request: ReadRequest) => SQLiteQuery) {
  return edge({
    operation: { input: LOG_READ, output: SQLITE_QUERY },
    inputSchema: readSpec.inputSchema,
    claim: { id: "urn:gooi:log:sqlite-read-lowered", version: 1 },
    scope: "Lowered the requested stream and range to a parameterized SQLite query",
  }, (input) => compile(input.value as unknown as ReadRequest));
}

const decodeEntries = edge({
  operation: { input: SQLITE_ROWS, output: LOG_ENTRIES },
  claim: { id: "urn:gooi:log:sqlite-entries-decoded", version: 1 },
  scope: "Decoded the JSON value column of every returned row in query order",
}, (input) => {
  if (!Array.isArray(input.value)) throw new Error("Expected SQLite rows");
  return input.value.map((row: Value) => {
    if (row === null || typeof row !== "object" || !("value" in row) || typeof row.value !== "string")
      throw new Error("Expected a JSON text value in the SQLite row");
    return JSON.parse(row.value) as Value;
  });
});

export function sqliteRead(use: Sqlite, statement: string, lower: Implementation) {
  return path(lower, sqliteQuery(use, statement), decodeEntries);
}
