---
status: done
created: 2026-11-04
finished: 2026-11-04
---

# Read GitHub issues as a query relation

Built 2026-11-04 as @gooi/github over GitHub's issues/list-for-repo. The relation is declared in code and checked against the operation extracted from GitHub's published OpenAPI description; deriving relations from OpenAPI is the OpenAPI adapter's job. GitHub's issues API has no fields parameter, so only filters, not columns, are pushed down.
