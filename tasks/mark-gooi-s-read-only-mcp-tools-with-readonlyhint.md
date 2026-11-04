---
status: done
created: 2026-11-04
finished: 2026-11-04
---

# Mark gooi's read-only MCP tools with readOnlyHint

MCP's tool annotations already name the distinction replay uses (Smithy's readonly, HTTP's safe methods). Each host says which of its tools only read, the MCP surface sets readOnlyHint on them, and an unknown name is refused when the server starts.
