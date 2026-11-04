---
status: open
created: 2026-11-04
---

# Search the web through SearXNG as a query relation

A SearXNG backing over its JSON API on 127.0.0.1:8888. As a relation, web has query, title, url, snippet, engine and published columns. WHERE query = '...' is pushed down as the search, and the relation refuses to run without it. The same search is an edge for commands and tools.
