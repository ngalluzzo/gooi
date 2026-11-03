---
status: open
created: 2026-11-03
---
# Compile the command tree to Commander

The command tree is a local dialect owned by surfaces/commander, not a shared IR. One lowering edge turns it into Commander source, and the source records the digest of the tree it came from.
