---
status: open
created: 2026-11-03
---
# Give edges input schemas

Describe each edge's input fields with JSON Schema, adopted rather than invented
(see the "never owns meaning" rule in AGENTS.md). MCP tool inputs and OpenAPI
already use it, and CLI flags and help can be derived from it. This is the first
prerequisite for compiling gooi's command into a standalone CLI.

- [x] Decide where the schema lives: on the edge (`inputSchema`), as MCP tools and
      OpenAPI operations do. Contracts stay plain `{id, version}` references.
- [x] Replace the hand-written field checks in apps/slices and apps/tasks. Slices
      still checks its stored file, which people may edit by hand.
- [ ] Show each command's fields in `gooi help`.
