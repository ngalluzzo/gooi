import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { lowerSelect, SQLITE_SELECT } from "./drizzle.js";
import { sqlite } from "./index.js";
import {
  bindQuery, SQLITE_QUERY, SQLITE_QUERY_TEMPLATE, SQLITE_ROWS, sqliteQuery, type SQLiteQueryTemplate,
} from "./query.js";

test("compiles and runs an inventory selection through the same SQLite edges", async () => {
  const description = artifact(SQLITE_SELECT, {
    table: "inventory",
    columns: ["sku", "quantity"],
    where: [
      { column: "location", op: "eq", parameter: "warehouse" },
      { column: "quantity", op: "gte", parameter: "minimum" },
    ],
    orderBy: "quantity",
    limit: "count",
  });
  const { artifact: templateArtifact } = await invoke(lowerSelect, description);
  expect(templateArtifact.contract).toEqual(SQLITE_QUERY_TEMPLATE);
  const template = templateArtifact.value as unknown as SQLiteQueryTemplate;
  expect(template.parameters).toEqual(["warehouse", "minimum", "count"]);
  expect(template.sql).toContain('from "inventory"');
  expect(() => bindQuery(template, { warehouse: "west", count: 1 })).toThrow("Missing SQLite parameter: minimum");

  const directory = mkdtempSync(join(tmpdir(), "gooi-sqlite-select-"));
  try {
    const use = sqlite(join(directory, "inventory.sqlite"));
    use((db) => db.exec(`
      CREATE TABLE inventory (sku TEXT, quantity INTEGER, location TEXT);
      INSERT INTO inventory VALUES ('B', 8, 'west'), ('A', 5, 'west'), ('C', 2, 'west'), ('D', 4, 'east');
    `));
    const query = bindQuery(template, { count: 1, minimum: 3, warehouse: "west" });
    expect(query.params).toEqual(["west", 3, 1]);
    expect(query.sql).not.toContain("west");
    const result = await invoke(sqliteQuery(use, template.sql), artifact(SQLITE_QUERY, query));
    expect(result.artifact).toEqual(artifact(SQLITE_ROWS, [{ sku: "A", quantity: 5 }]));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("SQL identifiers must be data from the supported select dialect", async () => {
  const invalid = artifact(SQLITE_SELECT, { table: 'inventory"; DROP TABLE inventory;--', columns: ["sku"] });
  await expect(invoke(lowerSelect, invalid)).rejects.toThrow("table must match pattern");
});
