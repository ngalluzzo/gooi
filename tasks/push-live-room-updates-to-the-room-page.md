---
status: open
created: 2026-11-03
---

# Push live room updates to the room page

Split out of "Lower a room view to a React page" so the static page ships first.

- Add a second edge that streams new room events (Matrix-shaped) and agent turns after a given position in the room log, with an input schema ({ roomId, since }).
- Lower it to a Hono SSE route next to /rooms/:roomId, reading the log through GOOI_STORE.
- On the client, append each streamed item through the same React renderer the static page uses, so there's one rendering path.
