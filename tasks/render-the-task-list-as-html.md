---
status: done
created: 2026-11-03
finished: 2026-11-03
---

# Render the task list as HTML

A renderTasks edge in apps/tasks turns the listing into a hast tree (an existing standard). Titles and problems are text nodes, never markup. A printHtml edge prints it and refuses unless it parses back to the same tree.
