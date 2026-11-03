import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The log's one SQLite shape. drizzle-kit generates ../drizzle from it, and the
// lowering's queries are typed by it; nothing else describes these tables.
export const streams = sqliteTable("streams", {
  stream: text().primaryKey(),
  length: integer().notNull(),
  updated: text().notNull(),
});

export const entries = sqliteTable("entries", {
  stream: text().notNull().references(() => streams.stream),
  position: integer().notNull(),
  // Plain text, not Drizzle's JSON mode: that mode stores a JSON null entry as SQL NULL.
  value: text().notNull(),
}, (table) => [primaryKey({ columns: [table.stream, table.position] })]);
