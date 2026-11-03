---
status: done
created: 2026-11-03
finished: 2026-11-03
---

# Let mentioned agents answer under their own Matrix IDs

Each agent the owner mentions answers once, in mention order, through a new ACP session whose prompt is the room so far. Replies are m.room.message events from @name:localhost. Only the owner's messages start turns.
