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

Surfaces (CLI, MCP, HTTP, UI) are not a fourth thing. Each is one generic adapter
that exposes any edge, written once, with no per-app code. Backings aren't either:
a backing is host-chosen code behind an edge, such as the model in `backings/`,
and provider code lives only there. Swapping one never changes the app.

Storage is a backing too. Apps store through two interfaces with no domain
meaning: records (named documents with compare-and-set) and logs (append-only
streams with an expected length). Every storage backing passes one law suite,
and the interfaces never gain queries.

## Rules

- A change may add an artifact contract, an edge, or a surface adapter. Anything
  else needs a written reason on this page, approved by the owner, first.
- Gooi owns the envelope (`{contract, value}`) and the edge. It never owns meaning.
  Every IR is an existing standard adopted by its contract ID, or a small local
  dialect owned by the one package that needs it. A dialect becomes shared only
  by being used twice, never by being designed to be shared.
- One open slice at a time. Agents work only on the open slice and stop when its
  done condition is met. Agents never open or choose the next slice.
- Tasks are shared: agents add and finish tasks in `tasks/` with `bun gooi task`,
  so the owner can follow along. Slices stay the owner's.
- Done means used: the owner used it for something real, recorded under Done.
- Nothing from `old/` or the deleted attempt comes back unless the open slice
  needs it. Docs inside `core/` may mention packages that no longer exist; that
  is history, not a to-do list.
- Keep this page to one screen. No ledgers, gate logs or "next" lists.

The two sections below are written by `bun gooi slice` (`status`, `open`,
`close --used`) from `.gooi/slices.json`. Don't edit them by hand. `bun gooi` and
the task pages (`bun run serve`: `/` and `/shadcn`) are generated: after changing
`apps/gooi/src/commands.ts`, `routes.ts` or `design.ts`, run `bun run compile`.

<!-- gooi:slices:start -->

## Open slice

**7. Agent conversations on a swappable log**

Gooi's agent appends each turn's ACP notifications, the owner's prompt included, to a log interface: append with an expected length, read, list. JSONL files and SQLite both pass one law suite, and host wiring picks between them. gooi agent sessions and gooi agent show --session follow ACP's session list and load.

Done when: the owner reads a past agent conversation with gooi agent show on both JSONL and SQLite, with no app change.

## Done

- **6. Tell an agent, get a task** (closed 2026-11-03). Used for: used both backings to try enriching the rac ACP output
- **5. Task page in shadcn** (closed 2026-11-03). Used for: using shadcn now to monitor the list
- **4. See tasks in a browser** (closed 2026-11-03). Used for: monitor the task list as it updates live
- **3. Compile the gooi command into a Commander CLI** (closed 2026-11-03). Used for: to close this task
- **2. Tasks as markdown files** (closed 2026-11-03). Used for: my agent tracks gooi's next tasks and I follow along
- _…and 1 earlier._

<!-- gooi:slices:end -->
