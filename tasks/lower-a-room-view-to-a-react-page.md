---
status: open
created: 2026-11-03
---

# Lower a room view to a React page

Plan sketch (following the lowering patterns we already use):
1. Neutral core: define a room selector mapping as an edge with an input schema ({ roomId }) — members, room events (Matrix v1.19 shapes), agent turns/sessions.
2. Lowering: lower that selector to a React renderer, printing TSX through the shared printer (ESTree, no string pasting), reusing shadcn + Tailwind like the task page.
3. Routes: compile a /rooms/:roomId route to the Hono server, backing the data with the room log via GOOI_STORE (jsonl/sqlite).
4. Live updates: a second edge streams/polls new events into the same lowered component.
Work out the split with @claude before implementing.
