---
status: open
created: 2026-11-03
---
# Give edges input schemas

Describe each edge's input fields with JSON Schema, adopted rather than invented
(see the "never owns meaning" rule in AGENTS.md). MCP tool inputs and OpenAPI
already use it, and CLI flags and help can be derived from it. This is the first
prerequisite for compiling gooi's command into a standalone CLI.

- [ ] Decide where the schema lives: on the edge, or on the contract's publication.
- [ ] Replace the hand-written field checks in apps/slices and apps/tasks.
- [ ] Show each command's fields in `gooi help`.
