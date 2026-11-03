import { edge } from "@gooi/exchange";
import { and, eq, gte, Placeholder, sql } from "drizzle-orm";
import { QueryBuilder, SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import {
  parameterSchema, SQLITE_QUERY_TEMPLATE, type SQLiteParameter, type SQLiteQueryTemplate,
} from "./query.js";
import {
  SQLITE_TRANSACTION_TEMPLATE, type SQLiteTransactionBatch, type SQLiteTransactionTemplate,
} from "./transaction.js";

/** A data-only subset of SQLite SELECT with named parameters. */
export const SQLITE_SELECT = Object.freeze({ id: "urn:gooi:sqlite:select", version: 1 });

export interface SQLiteSelect {
  readonly table: string;
  readonly columns: readonly string[];
  readonly where?: readonly {
    readonly column: string;
    readonly op: "eq" | "gte";
    readonly parameter: string;
  }[];
  readonly orderBy?: string;
  readonly limit?: string;
}

const identifier = { type: "string", pattern: "^[A-Za-z_][A-Za-z0-9_]*(?![\\s\\S])" };
const column = (name: string) => sql`${sql.identifier(name)}`;
const compare = { eq, gte };

const identifiers = { type: "array", minItems: 1, uniqueItems: true, items: identifier };
const selectSchema = {
  type: "object",
  properties: {
    table: identifier,
    columns: identifiers,
    where: {
      type: "array",
      items: {
        type: "object",
        properties: { column: identifier, op: { enum: ["eq", "gte"] }, parameter: identifier },
        required: ["column", "op", "parameter"],
        additionalProperties: false,
      },
    },
    orderBy: identifier,
    limit: identifier,
  },
  required: ["table", "columns"],
  additionalProperties: false,
};

function compileSelect(select: SQLiteSelect): SQLiteQueryTemplate {
  const fields = Object.fromEntries(select.columns.map((name) => [name, column(name)]));
  const filters = select.where?.map(({ column: name, op, parameter }) =>
    compare[op](column(name), sql.placeholder(parameter)));
  const query = new QueryBuilder().select(fields).from(column(select.table))
    .where(and(...(filters ?? []))).$dynamic();
  if (select.orderBy !== undefined) query.orderBy(column(select.orderBy));
  if (select.limit !== undefined) query.limit(sql.placeholder(select.limit));

  return template(query.toSQL());
}

function template({ sql: statement, params }: { sql: string; params: unknown[] }): SQLiteQueryTemplate {
  const parameters = params.map((param) => {
    if (!(param instanceof Placeholder)) throw new Error("Expected a named SQLite placeholder");
    return param.name;
  });
  return { sql: statement, parameters };
}

export const lowerSelect = edge({
  operation: { input: SQLITE_SELECT, output: SQLITE_QUERY_TEMPLATE },
  inputSchema: selectSchema,
  claim: { id: "urn:gooi:sqlite:select-lowered", version: 1 },
  scope: "Compiled the SQLite select description to a SQL template and its ordered parameter names",
}, (input) => compileSelect(input.value as unknown as SQLiteSelect));

export const SQLITE_TRANSACTION = Object.freeze({ id: "urn:gooi:sqlite:transaction", version: 1 });

interface Insert {
  readonly table: string;
  /** Column names also name the corresponding input parameters. */
  readonly columns: readonly string[];
  /** Fill this column with SQLite's UTC time during the insert. */
  readonly timestamp?: string;
  readonly onConflict?: { readonly target: string; readonly update: readonly string[] };
  readonly each?: SQLiteTransactionBatch;
}

export interface SQLiteTransaction {
  readonly check: {
    readonly select: SQLiteSelect;
    readonly expected: string;
    readonly whenMissing: SQLiteParameter;
  };
  readonly writes: readonly Insert[];
}

function compileInsert(insert: Insert): SQLiteQueryTemplate {
  const { columns, table, each, onConflict, timestamp } = insert;
  if (each && (each.json === each.index || !columns.includes(each.json) || !columns.includes(each.index)))
    throw new Error("A SQLite batch needs distinct JSON and index columns in the insert");
  if (onConflict && onConflict.update.some((name) => !columns.includes(name)))
    throw new Error("SQLite conflict updates must refer to inserted columns");
  if (timestamp !== undefined && (!columns.includes(timestamp) || timestamp === each?.json || timestamp === each?.index))
    throw new Error("SQLite timestamp must refer to an inserted column separate from the batch columns");

  const names = sql.join(columns.map(column), sql`, `);
  const values = sql.join(columns.map((name) =>
    name === timestamp ? sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` : sql.placeholder(name)), sql`, `);
  const statement = sql`insert into ${column(table)} (${names}) values (${values})`;
  if (onConflict) {
    const updates = onConflict.update.map((name) => sql`${column(name)} = excluded.${column(name)}`);
    statement.append(sql` on conflict (${column(onConflict.target)}) do update set ${sql.join(updates, sql`, `)}`);
  }
  return template(new SQLiteSyncDialect().sqlToQuery(statement));
}

export const lowerTransaction = edge({
  operation: { input: SQLITE_TRANSACTION, output: SQLITE_TRANSACTION_TEMPLATE },
  inputSchema: {
    type: "object",
    properties: {
      check: {
        type: "object",
        properties: {
          select: {
            ...selectSchema,
            properties: { ...selectSchema.properties, columns: { ...identifiers, maxItems: 1 } },
          },
          expected: identifier,
          whenMissing: parameterSchema,
        },
        required: ["select", "expected", "whenMissing"],
        additionalProperties: false,
      },
      writes: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            table: identifier,
            columns: identifiers,
            timestamp: identifier,
            onConflict: {
              type: "object",
              properties: { target: identifier, update: identifiers },
              required: ["target", "update"],
              additionalProperties: false,
            },
            each: {
              type: "object",
              properties: { source: identifier, json: identifier, index: identifier, startAt: identifier },
              required: ["source", "json", "index", "startAt"],
              additionalProperties: false,
            },
          },
          required: ["table", "columns"],
          additionalProperties: false,
        },
      },
    },
    required: ["check", "writes"],
    additionalProperties: false,
  },
  claim: { id: "urn:gooi:sqlite:transaction-lowered", version: 1 },
  scope: "Compiled the scalar guard and ordered inserts to a SQLite transaction template with named parameters",
}, (input): SQLiteTransactionTemplate => {
  const { check, writes } = input.value as unknown as SQLiteTransaction;
  return {
    check: {
      query: compileSelect(check.select), expected: check.expected, whenMissing: check.whenMissing,
    },
    writes: writes.map((insert) => ({
      query: compileInsert(insert),
      ...(insert.each === undefined ? {} : { each: insert.each }),
    })),
  };
});
