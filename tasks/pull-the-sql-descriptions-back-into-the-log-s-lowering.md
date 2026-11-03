---
status: done
created: 2026-11-03
finished: 2026-11-03
---

# Pull the SQL descriptions back into the log's lowering

SQLITE_SELECT and SQLITE_TRANSACTION were a small query language gooi owned, made general for a test fixture. The log's one SQLite lowering now writes Drizzle's typed queries directly, compiling the read to a trusted template once at load. @gooi/sqlite keeps only the connection, the trusted-statement query edge and named parameter binding.
