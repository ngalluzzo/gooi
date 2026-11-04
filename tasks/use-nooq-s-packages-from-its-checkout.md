---
status: done
created: 2026-11-04
finished: 2026-11-04
---

# Use nooq's packages from its checkout

gooi uses @nooq/core, @nooq/yjs and @nooq/plugins as nooq ships them in its checkout, without publishing them or copying their code. nooq's own workspace dependencies have to resolve as they do inside nooq.

Built on 2026-11-04 with tsconfig paths in apps/nooq-docs and hosts/nooq pointing at the sibling nooq checkout. Bun honors them at run time and tsc in the typecheck, and nooq's own dependencies resolve from its checkout. One reach-in: the table formatters come from plugin-tables/src/export.ts, which nooq's package exports don't list yet. Tests that use documents need the nooq checkout beside this repo.
