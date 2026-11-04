---
status: open
created: 2026-11-04
---

# Fetch a web page as Markdown, safely

An edge that fetches an http(s) page and returns it as Markdown, going HTML to hast to mdast to Markdown with existing tools, so no strings are pasted together. Agents choose the URLs, so it refuses local and private addresses (after DNS resolution and on every redirect), caps the response size and time, and keeps only text: no script, styles or images.
