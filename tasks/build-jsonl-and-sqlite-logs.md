---
status: open
created: 2026-11-03
---

# Build JSONL and SQLite logs

backings/jsonl and backings/sqlite both pass the same laws, including racing appends, plus a cross-process race each. JSONL repairs a torn last line.
