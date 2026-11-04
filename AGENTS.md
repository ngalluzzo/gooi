# Gooi: read this first

This page is the whole plan. There is no other design doc. `old/` is reference
material, not a to-do list: never plan from its inventories, ledgers or app lists.

## What gooi is for

Write an app's logic once and use it from anywhere (a CLI, MCP, HTTP, a UI, or
tools that already exist), and reuse pieces of one app in another.

## The three things

1. **Artifact**: a typed value, `{contract, value}`, identified by its content. (`core/kernel`)
2. **Edge**: an operation, `Implementation {operation, run}`, from an input artifact to an output artifact. (`core/exchange`)
3. **Run record**: caller + request ID + exact input + state. Not built. It comes
   back only when an app needs retries or replay.

Surfaces (CLI, MCP, HTTP, UI) expose edges through generic adapters. The host
chooses the backings behind those edges. Each native binding in `backings/`
owns its provider's mechanics and can serve multiple contracts.

Storage contracts define operations and laws. `@gooi/log` owns conditional
append, read, and list as edges, plus the mappings to JSONL files and SQLite
transactions. Each mapping is shared by every app using the log and passes the
same laws. Apps own the entries' meaning and express domain queries as edges.

## Rules

- A change may add an artifact contract, an edge, or a surface adapter. Anything
  else needs a written reason on this page, approved by the owner, first.
- Gooi owns the envelope (`{contract, value}`) and the edge. It never owns meaning.
  Every IR is an existing standard adopted by its contract ID, or a small local
  dialect owned by the one package that needs it. A dialect becomes shared only
  by being used twice, never by being designed to be shared.
- One open slice at a time. When a slice is built but the real use that closes it
  hasn't come yet, the owner moves it to waiting and may open the next; it closes
  when that use comes, never with a staged one. Agents work only on the open slice
  and stop when it's built. Agents never open or choose the next slice.
- Tasks are shared: agents add and finish tasks in `tasks/` with `bun gooi task`,
  so the owner can follow along. Slices stay the owner's.
- Done means used: the owner used it for something real, recorded under Done.
- Nothing from `old/` or the deleted attempt comes back unless the open slice
  needs it. Docs inside `core/` may mention packages that no longer exist; that
  is history, not a to-do list.
- Keep this page to one screen. No ledgers, gate logs or "next" lists.

The owner updates the generated sections below through `bun gooi slice open`,
`slice wait` and `slice close --used`, which all use `.gooi/slices.json`. `bun gooi` and
the task pages (`bun run serve`: `/` and `/shadcn`) are generated: after changing
`hosts/gooi/src/commands.ts`, `routes.ts` or `design.ts`, run `bun run compile`.

<!-- gooi:slices:start -->

## Open slice

**14. Web search as a source**

A SearXNG backing turns the SearXNG already running on 127.0.0.1:8888 into a web relation the query engine can read: a query's WHERE query = '...' is pushed down as the search itself, and the relation refuses to run without one. Search and fetch are also edges. Fetch reads a page as Markdown through hast and mdast, refuses local and private addresses, and caps size and time. Both hosts expose search and fetch on their CLIs and MCP servers, and the room agents get them as tools.

Done when: the owner uses a web search for something real: in a query, in a room, or through MCP.

## Waiting for use

- **10. Replay a room answer with a change**. Closes when: the owner replays a real past room answer with a different backing or the current instructions, and uses the comparison to decide something.
- **13. One query over Markdown tasks and GitHub issues**. Closes when: the owner uses a view that shows their Markdown tasks and GitHub issues from one query, for real work.

## Done

- **12. nooq documents through gooi** (closed 2026-11-04). Used for: accepted Claude Code's MCP suggestion noting the Markdown round-trip limits in nooq's gap audit
- **11. Gooi's edges over MCP** (closed 2026-11-04). Used for: Claude Code tracked its MCP follow-ups as gooi tasks through gooi's MCP tools: added two and finished one
- **9. A second host: tasks and a room for nooq** (closed 2026-11-03). Used for: asked the nooq room to turn the BlockNote gap audit into nooq tasks
- **8. Claude and OMLx in one room** (closed 2026-11-03). Used for: reviewed my ongoing conversation with both agents
- **7. Agent conversations on a swappable log** (closed 2026-11-03). Used for: reviewed my ongoing conversation with claude
- _…and 6 earlier._

<!-- gooi:slices:end -->
