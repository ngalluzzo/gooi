import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { lowerTransaction, SQLITE_TRANSACTION, type SQLiteTransaction } from "./drizzle.js";
import { sqlite } from "./index.js";
import {
  SQLITE_TRANSACTION_INPUT, SQLITE_TRANSACTION_RESULT, SQLITE_TRANSACTION_TEMPLATE,
  sqliteTransaction, type SQLiteTransactionTemplate,
} from "./transaction.js";

test("compiles and executes a guarded inventory update and audit batch", async () => {
  const description = artifact(SQLITE_TRANSACTION, {
    check: {
      select: {
        table: "inventory",
        columns: ["quantity"],
        where: [{ column: "sku", op: "eq", parameter: "sku" }],
      },
      expected: "previous",
      whenMissing: 0,
    },
    writes: [
      { table: "inventory", columns: ["sku", "quantity"], onConflict: { target: "sku", update: ["quantity"] } },
      {
        table: "audit",
        columns: ["sku", "revision", "detail"],
        each: { source: "events", json: "detail", index: "revision", startAt: "firstRevision" },
      },
    ],
  } satisfies SQLiteTransaction);
  const { artifact: compiled } = await invoke(lowerTransaction, description);
  expect(compiled.contract).toEqual(SQLITE_TRANSACTION_TEMPLATE);
  const template = compiled.value as unknown as SQLiteTransactionTemplate;
  expect(template.check.query.parameters).toEqual(["sku"]);
  expect(template.writes.map(({ query }) => query.parameters)).toEqual([
    ["sku", "quantity"], ["sku", "revision", "detail"],
  ]);

  const directory = mkdtempSync(join(tmpdir(), "gooi-guarded-transaction-"));
  try {
    const use = sqlite(join(directory, "inventory.sqlite"));
    use((db) => db.exec(`
      CREATE TABLE inventory (sku TEXT PRIMARY KEY, quantity INTEGER NOT NULL);
      CREATE TABLE audit (sku TEXT, revision INTEGER, detail TEXT);
    `));
    const transaction = sqliteTransaction(use, template);
    const input = artifact(SQLITE_TRANSACTION_INPUT, {
      sku: "A", previous: 0, quantity: 3, firstRevision: 10, events: [false, null],
    });
    expect((await invoke(transaction, input)).artifact).toEqual(
      artifact(SQLITE_TRANSACTION_RESULT, { committed: true }),
    );
    expect((await invoke(transaction, input)).artifact.value).toEqual({ committed: false, actual: 3 });
    expect(use((db) => db.query("SELECT * FROM audit ORDER BY revision").all())).toEqual([
      { sku: "A", revision: 10, detail: "false" },
      { sku: "A", revision: 11, detail: "null" },
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
