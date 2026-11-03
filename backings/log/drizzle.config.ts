import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/sqlite-tables.ts",
  out: "./drizzle",
});
