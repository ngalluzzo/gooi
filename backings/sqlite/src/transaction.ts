import { edge } from "@gooi/exchange";
import type { Value } from "@gooi/kernel/types";
import type { Sqlite } from "./index.js";
import type { SQLiteParameter, SQLiteQueryTemplate } from "./query.js";

export const SQLITE_TRANSACTION_TEMPLATE = Object.freeze({ id: "urn:gooi:sqlite:transaction-template", version: 1 });
export const SQLITE_TRANSACTION_INPUT = Object.freeze({ id: "urn:gooi:sqlite:transaction-input", version: 1 });
export const SQLITE_TRANSACTION_RESULT = Object.freeze({ id: "urn:gooi:sqlite:transaction-result", version: 1 });

export interface SQLiteTransactionBatch {
  /** A named input array. Bind each item as JSON text and its position as startAt + index. */
  readonly source: string;
  readonly json: string;
  readonly index: string;
  readonly startAt: string;
}

export interface SQLiteTransactionTemplate {
  readonly check: {
    readonly query: SQLiteQueryTemplate;
    readonly expected: string;
    readonly whenMissing: SQLiteParameter;
  };
  readonly writes: readonly {
    readonly query: SQLiteQueryTemplate;
    readonly each?: SQLiteTransactionBatch;
  }[];
}

export type SQLiteTransactionResult =
  | { readonly committed: true }
  | { readonly committed: false; readonly actual: SQLiteParameter };

type Inputs = Readonly<Record<string, Value>>;

function scalar(value: unknown): value is SQLiteParameter {
  return value === null || typeof value === "number" || typeof value === "string";
}

function parameter(inputs: Inputs, name: string): SQLiteParameter {
  const value = Object.hasOwn(inputs, name) ? inputs[name] : undefined;
  if (!scalar(value)) throw new Error(`Expected a SQLite scalar parameter: ${name}`);
  return value;
}

/** Bind a trusted compiled template and a database. Invocations supply values
 * only. A failed check runs zero writes. Any write error rolls back the batch. */
export function sqliteTransaction(use: Sqlite, template: SQLiteTransactionTemplate) {
  return edge({
    operation: { input: SQLITE_TRANSACTION_INPUT, output: SQLITE_TRANSACTION_RESULT },
    inputSchema: { type: "object" },
    claim: { id: "urn:gooi:sqlite:transaction-outcome", version: 1 },
    scope: "Observed the scalar guard inside an immediate SQLite transaction and either refused before writes or committed all writes",
    observations: "artifact-id",
  }, (input): SQLiteTransactionResult => {
    const inputs = input.value as Inputs;
    const { check, writes } = template;
    const expected = parameter(inputs, check.expected);
    const readParams = check.query.parameters.map((name) => parameter(inputs, name));

    return use((db) => db.transaction((): SQLiteTransactionResult => {
      const rows = db.query(check.query.sql).values(...readParams);
      if (rows.length > 1 || (rows.length === 1 && rows[0]!.length !== 1))
        throw new Error("A SQLite transaction guard must return at most one scalar");
      const actual = rows.length ? rows[0]![0] : check.whenMissing;
      if (!scalar(actual)) throw new Error("Expected a SQLite scalar from the transaction guard");
      if (actual !== expected) return { committed: false, actual };

      for (const { query, each } of writes) {
        const statement = db.query(query.sql);
        if (each === undefined) {
          statement.run(...query.parameters.map((name) => parameter(inputs, name)));
          continue;
        }
        const items = Object.hasOwn(inputs, each.source) ? inputs[each.source] : undefined;
        const start = parameter(inputs, each.startAt);
        if (!Array.isArray(items)) throw new Error(`Expected a SQLite batch: ${each.source}`);
        if (typeof start !== "number" || !Number.isSafeInteger(start) || !Number.isSafeInteger(start + items.length))
          throw new Error(`Invalid SQLite batch start: ${each.startAt}`);
        items.forEach((item, index) => {
          const params = query.parameters.map((name) => {
            if (name === each.json) return JSON.stringify(item);
            if (name === each.index) return start + index;
            return parameter(inputs, name);
          });
          statement.run(...params);
        });
      }
      return { committed: true };
    }).immediate());
  });
}
