import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { named, pushdown, type Filter } from "./pushdown.js";

export type { Constant, Filter, Operator } from "./pushdown.js";

// Tables are Frictionless tabular data resources (Data Package v2) with inline
// data: a JSON standard with typed fields. gooi artifacts are JSON values, so
// Arrow's binary IPC doesn't fit them; this does, and DuckDB reads it directly.

/** The contract of a tabular data resource with inline data. */
export const TABLE = Object.freeze({ id: "https://datapackage.org/standard/data-resource/#tabular", version: 2 });

export type FieldType = "string" | "integer" | "number" | "boolean" | "date" | "datetime" | "array";
export interface Field {
  readonly name: string;
  readonly type: FieldType;
  readonly description?: string;
}
export interface Schema {
  readonly fields: readonly Field[];
}
export type Row = { readonly [column: string]: unknown };
export interface Table {
  readonly type: "table";
  readonly data: readonly Row[];
  readonly schema: Schema;
}

/** A source the query reads remotely. It says which filters it can apply
 * itself; `fetch` must return every row that matches the filters it's given
 * (more is fine: DuckDB filters again). */
export interface Relation {
  readonly schema: Schema;
  readonly pushable: { readonly [column: string]: readonly Filter["op"][] };
  fetch(filters: readonly Filter[]): Promise<readonly Row[]>;
}

export interface Sources {
  readonly tables?: { readonly [name: string]: Table };
  readonly relations?: { readonly [name: string]: Relation };
}

export interface Answer {
  readonly table: Table;
  /** For each relation the query named: what it was asked to filter, and how many rows it returned. */
  readonly pushed: { readonly [relation: string]: { readonly filters: readonly Filter[]; readonly rows: number } };
}

const NAME = /^[a-z_][a-z0-9_]{0,62}$/u;
const SQL_TYPES: Record<FieldType, string> = {
  string: "VARCHAR", integer: "BIGINT", number: "DOUBLE", boolean: "BOOLEAN",
  date: "DATE", datetime: "TIMESTAMPTZ", array: "VARCHAR[]",
};

/** Load rows through DuckDB's own JSON reader, typed by the schema. Nothing
 * from the rows becomes SQL text. */
async function load(connection: DuckDBConnection, name: string, schema: Schema, rows: readonly Row[]) {
  if (!NAME.test(name)) throw new Error(`Source names are lowercase letters, digits and underscores: "${name}"`);
  const columns = schema.fields.map((field) => {
    if (!NAME.test(field.name)) throw new Error(`Column names are lowercase letters, digits and underscores: "${field.name}"`);
    return `"${field.name}" ${SQL_TYPES[field.type]}`;
  });
  await connection.run(`CREATE TABLE "${name}" (${columns.join(", ")})`);
  if (!rows.length) return;
  const structure = Object.fromEntries(schema.fields.map((field) =>
    [field.name, field.type === "array" ? ["VARCHAR"] : SQL_TYPES[field.type]]));
  const values = rows.map((row) => Object.fromEntries(schema.fields.map((field) => [field.name, row[field.name] ?? null])));
  await connection.run(
    `INSERT INTO "${name}" SELECT unnest(from_json($1::JSON, $2), recursive := true)`,
    [JSON.stringify(values), JSON.stringify([structure])],
  );
}

function fieldType(sqlType: string): FieldType {
  if (/^(BIGINT|INTEGER|SMALLINT|TINYINT|HUGEINT|UBIGINT|UINTEGER|USMALLINT|UTINYINT|UHUGEINT)$/u.test(sqlType)) return "integer";
  if (/^(DOUBLE|FLOAT|REAL|DECIMAL)/u.test(sqlType)) return "number";
  if (sqlType === "BOOLEAN") return "boolean";
  if (sqlType === "DATE") return "date";
  if (sqlType.startsWith("TIMESTAMP")) return "datetime";
  if (sqlType.endsWith("[]")) return "array";
  return "string";
}

function value(type: FieldType, raw: unknown): unknown {
  if (raw === null || raw === undefined) return null;
  switch (type) {
    case "integer": {
      const n = Number(raw);
      return Number.isSafeInteger(n) ? n : String(raw);
    }
    case "number": return Number(raw);
    case "datetime": {
      // DuckDB writes "2026-11-03 00:00:00+00"; ISO 8601 wants a T and a +00:00 offset.
      const date = new Date(String(raw).replace(" ", "T").replace(/([+-]\d\d)$/u, "$1:00"));
      return Number.isNaN(date.getTime()) ? String(raw) : date.toISOString();
    }
    default: return raw;
  }
}

/** A DuckDB binding. Each query runs in its own in-memory database that can't
 * reach files, the network or extensions, and that holds only the sources. */
export function duckdb() {
  async function parse(connection: DuckDBConnection, sql: string): Promise<unknown> {
    const reader = await connection.runAndReadAll("SELECT json_serialize_sql($1::VARCHAR) AS ast", [sql]);
    const ast = JSON.parse(String(reader.getRowObjects()[0]!.ast)) as { error?: boolean; error_message?: string; statements?: unknown[] };
    if (ast.error) throw new Error(`Only one SELECT can be queried: ${ast.error_message}`);
    if (ast.statements?.length !== 1) throw new Error("Only one SELECT can be queried");
    return ast;
  }

  return {
    async query(sql: string, sources: Sources): Promise<Answer> {
      const instance = await DuckDBInstance.create(":memory:", {
        autoload_known_extensions: "false",
        autoinstall_known_extensions: "false",
        enable_external_access: "false",
      });
      const connection = await instance.connect();
      try {
        await connection.run("SET TimeZone = 'UTC'");
        const tables = sources.tables ?? {}, relations = sources.relations ?? {};
        const columns = new Map<string, string[]>([
          ...Object.entries(tables).map(([name, t]) => [name, t.schema.fields.map((f) => f.name)] as [string, string[]]),
          ...Object.entries(relations).map(([name, r]) => [name, r.schema.fields.map((f) => f.name)] as [string, string[]]),
        ]);
        const ast = await parse(connection, sql);
        const plan = pushdown(ast, columns, new Set(Object.keys(relations)));
        // Only the relations the query names are fetched: a source costs nothing until it's used.
        const used = named(ast);

        for (const [name, table] of Object.entries(tables)) await load(connection, name, table.schema, table.data);
        const pushed: Record<string, { filters: Filter[]; rows: number }> = {};
        for (const [name, relation] of Object.entries(relations)) {
          if (!used.has(name)) continue;
          const filters = (plan.get(name) ?? []).filter((f) => relation.pushable[f.column]?.includes(f.op));
          const rows = await relation.fetch(filters);
          await load(connection, name, relation.schema, rows);
          pushed[name] = { filters, rows: rows.length };
        }
        await connection.run("SET lock_configuration = true");

        const reader = await connection.runAndReadAll(sql);
        const fields = reader.columnNames().map((name, i): Field =>
          ({ name, type: fieldType(reader.columnTypes()[i]!.toString()) }));
        const data = reader.getRowObjectsJson().map((row) =>
          Object.fromEntries(fields.map((field) => [field.name, value(field.type, (row as Row)[field.name])])));
        return { table: { type: "table", data, schema: { fields } }, pushed };
      } finally {
        connection.closeSync();
        instance.closeSync();
      }
    },
  };
}

export type DuckDB = ReturnType<typeof duckdb>;
