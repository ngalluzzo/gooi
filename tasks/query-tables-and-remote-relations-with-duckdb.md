---
status: done
created: 2026-11-04
finished: 2026-11-04
---

# Query tables and remote relations with DuckDB

Built 2026-11-04 as @gooi/duckdb. Two differences from slice 13's wording: answers are Frictionless tabular data resources, not Arrow, because gooi artifacts are JSON and Arrow's IPC is binary. And the old C++ pushdown extension doesn't come back: DuckDB's own parser (json_serialize_sql) finds the filters that are safe to push, the relation fetches with them, and DuckDB runs the whole query, so it works in Bun on any platform without a native extension.
