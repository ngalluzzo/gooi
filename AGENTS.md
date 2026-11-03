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
that exposes any edge, written once, with no per-app code.

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
`close --used`) from `.gooi/slices.json`. Don't edit them by hand. `bun gooi` is
generated: after changing `apps/gooi/src/commands.ts`, run `bun run compile`.

<!-- gooi:slices:start -->

## Open slice

**4. See tasks in a browser**

The tasks app renders its listing to HTML through an HTML syntax tree, printed and parsed back. A compiled server runs the task list then render path on each request; titles are text, never markup.

Done when: the owner keeps the task page open while working and it shows current tasks, including hand edits and agent changes.

## Done

- **3. Compile the gooi command into a Commander CLI** (closed 2026-11-03). Used for: to close this task
- **2. Tasks as markdown files** (closed 2026-11-03). Used for: my agent tracks gooi's next tasks and I follow along
- **1. Gooi tracks itself (CLI)** (closed 2026-11-03). Used for: to check the status of the project

<!-- gooi:slices:end -->
