---
status: open
created: 2026-11-03
---

# Lower a room view to a React page

Follow the task page's pattern: the app renders HTML, the host maps it to shadcn. A throwaway preview of the owner's #gooi room on 2026-11-03 checked this plan.

1. Data: reuse the room's existing read, the step behind `room show` that returns Matrix's `/messages` shape. `rooms()` hands it out alongside `say` and `show`. No new selector edge.
2. `renderRoom` in the room app: Matrix messages to hast, a sibling of the text renderer. Use plain semantic HTML with one element per component layer, so the host can map each one: message, content, bubble, sender, time, and a joined line.
3. Bodies are Markdown. Convert them through mdast to hast (mdast-util-from-markdown, mdast-util-to-hast), never HTML strings. Matrix's standard place for the result is `formatted_body` with `format: org.matrix.custom.html`. Mark mentions from `m.mentions`, not by guessing from the text.
4. Host design rules (`design.ts`), mapping to shadcn components:
   - Message (avatar, header, content, footer), aligned to the end for the owner.
   - Bubble: default for the owner, muted for agents, destructive for "(couldn't answer…)".
   - Marker for joins, Badge for the "agent" tag.
   Message, Bubble and Marker come from shadcn's registry and need no new npm packages.
5. Route: `/room?room=<name>`: the read, then renderRoom, then reactPage. It refreshes every 5 seconds like the task page, and `flex-col-reverse` opens it at the newest message without JavaScript.

Not now:
- Message Scroller (client-only).
- AI Elements (client-only, and it brings the AI SDK's message format beside Matrix).
- A composer: web writes wait for the server to listen on 127.0.0.1 only and check request origins.

Live updates stay in "Push live room updates to the room page".
