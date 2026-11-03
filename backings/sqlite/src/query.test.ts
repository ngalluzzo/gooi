import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { sqlite } from "./index.js";
import { bindQuery, SQLITE_QUERY, SQLITE_ROWS, sqliteQuery } from "./query.js";

const template = {
  sql: "SELECT sku FROM inventory WHERE warehouse = ? AND count >= ? ORDER BY sku",
  parameters: ["warehouse", "minimum"],
};

test("binds named parameters in placeholder order and refuses a missing one", () => {
  expect(bindQuery(template, { minimum: 3, warehouse: "west" })).toEqual({
    sql: template.sql,
    params: ["west", 3],
  });
  expect(() => bindQuery(template, { warehouse: "west" })).toThrow("Missing SQLite parameter: minimum");
});

test("runs the one host-bound statement with values only", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gooi-sqlite-query-"));
  try {
    const use = sqlite(join(dir, "db"));
    use((db) => db.exec(`
      CREATE TABLE inventory (sku TEXT, warehouse TEXT, count INTEGER);
      INSERT INTO inventory VALUES ('a', 'west', 5), ('b', 'west', 1), ('c', 'east', 9);
    `));
    const query = sqliteQuery(use, template.sql);
    const bound = bindQuery(template, { warehouse: "west", minimum: 3 });
    const result = await invoke(query, artifact(SQLITE_QUERY, bound));
    expect(result.artifact).toEqual(artifact(SQLITE_ROWS, [{ sku: "a" }]));
    await expect(
      invoke(query, artifact(SQLITE_QUERY, { sql: "DELETE FROM inventory", params: [] })),
    ).rejects.toThrow("sql must be equal to constant");
    expect(use((db) => db.query("SELECT count(*) AS n FROM inventory").get())).toEqual({ n: 3 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
