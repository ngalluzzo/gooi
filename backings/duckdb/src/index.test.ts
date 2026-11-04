import { describe, expect, test } from "bun:test";
import { duckdb, type Filter, type Relation, type Row, type Table } from "./index.js";

const db = duckdb();

const tasks: Table = {
  type: "table",
  schema: { fields: [
    { name: "name", type: "string" }, { name: "title", type: "string" },
    { name: "status", type: "string" }, { name: "created", type: "date" },
  ] },
  data: [
    { name: "ship-room", title: "Ship the room page", status: "open", created: "2026-11-03" },
    { name: "fix-paste", title: "Fix rich paste", status: "done", created: "2026-11-01" },
  ],
};

const ISSUES: Row[] = [
  { number: 1, title: "Fix rich paste", state: "closed", labels: ["bug"], updated_at: "2026-10-02T00:00:00Z" },
  { number: 2, title: "Ship the room page", state: "open", labels: ["ui"], updated_at: "2026-11-02T00:00:00Z" },
  { number: 3, title: "Tables lose columns", state: "open", labels: ["bug", "export"], updated_at: "2026-11-03T12:00:00Z" },
];

/** A relation over fixed rows that applies the filters it can, and records what it was asked. */
function fake(pushable: Relation["pushable"] = { state: ["="], labels: ["contains"], updated_at: [">="] }) {
  const asked: Filter[][] = [];
  const relation: Relation = {
    schema: { fields: [
      { name: "number", type: "integer" }, { name: "title", type: "string" }, { name: "state", type: "string" },
      { name: "labels", type: "array" }, { name: "updated_at", type: "datetime" },
    ] },
    pushable,
    async fetch(filters) {
      asked.push([...filters]);
      return ISSUES.filter((row) => filters.every((f) =>
        f.op === "=" ? row[f.column] === f.value
          : f.op === "contains" ? (row[f.column] as string[]).includes(String(f.value))
            : f.op === ">=" ? String(row[f.column]) >= String(f.value) : true));
    },
  };
  return { relation, asked };
}

describe("query", () => {
  test("one SELECT over a local table and a remote relation, with filters pushed to the relation", async () => {
    const { relation, asked } = fake();
    const answer = await db.query(
      "SELECT t.title, i.number FROM tasks t JOIN issues i ON i.title = t.title WHERE i.state = 'open' ORDER BY i.number",
      { tables: { tasks }, relations: { issues: relation } },
    );
    expect(answer.table.data).toEqual([{ title: "Ship the room page", number: 2 }]);
    expect(answer.table.schema.fields).toEqual([{ name: "title", type: "string" }, { name: "number", type: "integer" }]);
    expect(asked).toEqual([[{ column: "state", op: "=", value: "open" }]]);
    expect(answer.pushed).toEqual({ issues: { filters: [{ column: "state", op: "=", value: "open" }], rows: 2 } });
  });

  test("pushdown never changes the answer: the same query over everything gives the same rows", async () => {
    const queries = [
      "SELECT number FROM issues WHERE state = 'open' AND list_contains(labels, 'bug') ORDER BY number",
      "SELECT t.name, i.number FROM tasks t LEFT JOIN issues i ON i.title = t.title WHERE i.state = 'open' ORDER BY 1",
      "SELECT count(*) AS n FROM issues WHERE updated_at >= TIMESTAMPTZ '2026-11-01' AND state = 'open'",
      "SELECT number FROM issues WHERE 'open' = state ORDER BY number",
    ];
    for (const sql of queries) {
      const pushed = await db.query(sql, { tables: { tasks }, relations: { issues: fake().relation } });
      const full = await db.query(sql, { tables: { tasks }, relations: { issues: fake({}).relation } });
      expect(pushed.table, sql).toEqual(full.table);
      expect(pushed.pushed.issues!.filters.length, sql).toBeGreaterThan(0);
      expect(full.pushed.issues!.rows, sql).toBe(3);
    }
  });

  test("filters that could change the answer aren't pushed", async () => {
    const cases: [string, Filter[]][] = [
      ["SELECT number FROM issues WHERE state = 'open' OR number = 1", []],
      ["SELECT number FROM issues WHERE NOT (state = 'open')", []],
      ["SELECT a.number FROM issues a, issues b WHERE a.state = 'open' AND a.number = b.number", []],
      ["SELECT number FROM issues WHERE state IS NULL", []],
      ["SELECT t.name FROM tasks t LEFT JOIN issues i ON i.title = t.title AND i.state = 'open'", []],
      ["WITH open AS (SELECT * FROM issues WHERE state = 'open') SELECT number FROM open", [{ column: "state", op: "=", value: "open" }]],
    ];
    for (const [sql, filters] of cases) {
      const { relation, asked } = fake();
      const answer = await db.query(sql, { tables: { tasks }, relations: { issues: relation } });
      expect(asked, sql).toEqual([filters]);
      const full = await db.query(sql, { tables: { tasks }, relations: { issues: fake({}).relation } });
      expect(answer.table, sql).toEqual(full.table);
    }
  });

  test("a relation is only asked for the filters it says it can apply", async () => {
    const { relation, asked } = fake({ state: ["="] });
    await db.query("SELECT number FROM issues WHERE state = 'open' AND list_contains(labels, 'bug')", { relations: { issues: relation } });
    expect(asked).toEqual([[{ column: "state", op: "=", value: "open" }]]);
  });

  test("values come back JSON-safe: dates, times, lists and numbers", async () => {
    const answer = await db.query(
      "SELECT created, created::TIMESTAMPTZ AS at, ['a', 'b'] AS list, 2.5::DECIMAL(3,1) AS dec, NULL::VARCHAR AS none FROM tasks WHERE name = 'ship-room'",
      { tables: { tasks } },
    );
    expect(answer.table.data).toEqual([{ created: "2026-11-03", at: "2026-11-03T00:00:00.000Z", list: ["a", "b"], dec: 2.5, none: null }]);
    expect(answer.table.schema.fields.map((f) => f.type)).toEqual(["date", "datetime", "array", "number", "string"]);
  });
});

describe("safety", () => {
  test("only one SELECT runs; files, the environment and settings are out of reach", async () => {
    await expect(db.query("DELETE FROM tasks", { tables: { tasks } })).rejects.toThrow("Only one SELECT can be queried");
    await expect(db.query("SELECT 1; SELECT 2", {})).rejects.toThrow("Only one SELECT can be queried");
    await expect(db.query("SELECT * FROM read_csv('/etc/hosts')", {})).rejects.toThrow(/disabled|Permission/u);
    await expect(db.query("SELECT getenv('HOME') AS home", {})).rejects.toThrow();
    await expect(db.query("SELECT current_setting('enable_external_access') AS x", {})).resolves.toMatchObject({ table: { data: [{ x: false }] } });
  });

  test("source and column names can't be used to write SQL", async () => {
    const bad: Table = { ...tasks, schema: { fields: [{ name: 'x" VARCHAR); DROP TABLE y; --', type: "string" }] } };
    await expect(db.query("SELECT 1", { tables: { bad } })).rejects.toThrow("Column names are lowercase letters");
    await expect(db.query("SELECT 1", { tables: { "Robert'); --": tasks } })).rejects.toThrow("Source names are lowercase letters");
  });
});
