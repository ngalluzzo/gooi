---
status: done
created: 2026-11-03
finished: 2026-11-03
---

# Separate log lowering from native storage

Keep JSONL file and SQLite database bindings independent of the log contract. Bind the log-specific mappings in the host and verify both stores with the existing laws and CLI replay.
