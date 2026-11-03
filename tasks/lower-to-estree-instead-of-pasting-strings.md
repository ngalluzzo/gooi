---
status: done
created: 2026-11-03
finished: 2026-11-03
---

# Lower to ESTree instead of pasting strings

The Commander lowering pasted strings: a tree whose module name held a newline broke out of a comment into a live statement, and a reserved word as the export name gave invalid JavaScript. Build an ESTree program instead (an existing standard, plain JSON), print it with an existing printer, and re-parse the output before claiming success.
