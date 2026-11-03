import { edge } from "@gooi/exchange";
import type { Sqlite } from "./index.js";

export const SQLITE_QUERY = Object.freeze({ id: "urn:gooi:sqlite:query", version: 1 });
export const SQLITE_ROWS = Object.freeze({ id: "urn:gooi:sqlite:rows", version: 1 });

export type SQLiteParameter = string | number | null;

export const parameterSchema = {
  anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
};

export interface SQLiteQueryTemplate {
  readonly sql: string;
  /** Parameter names in SQL placeholder order. */
  readonly parameters: readonly string[];
}

export interface SQLiteQuery {
  readonly sql: string;
  readonly params: readonly SQLiteParameter[];
}

export function bindQuery(
  template: SQLiteQueryTemplate,
  bindings: Readonly<Record<string, SQLiteParameter>>,
): SQLiteQuery {
  const params = template.parameters.map((name) => {
    if (!Object.hasOwn(bindings, name)) throw new Error(`Missing SQLite parameter: ${name}`);
    return bindings[name]!;
  });
  return { sql: template.sql, params };
}

/** Bind one trusted SELECT template and a database. Query artifacts can supply
 * parameters to that statement. The host is responsible for the template. */
export function sqliteQuery(use: Sqlite, statement: string) {
  return edge({
    operation: { input: SQLITE_QUERY, output: SQLITE_ROWS },
    inputSchema: {
      type: "object",
      properties: {
        sql: { const: statement },
        params: { type: "array", items: parameterSchema },
      },
      required: ["sql", "params"],
      additionalProperties: false,
    },
    claim: { id: "urn:gooi:sqlite:queried", version: 1 },
    scope: "Executed the host-bound statement with the supplied parameters and observed its JSON-compatible rows in query order",
    observations: "artifact-id",
  }, (input) => {
    const { params } = input.value as unknown as SQLiteQuery;
    return use((db) => db.query(statement).all(...params));
  });
}
