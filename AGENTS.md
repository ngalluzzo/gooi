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
- One open slice at a time. Agents work only on the open slice and stop when its
  done condition is met. Agents never open or choose the next slice.
- Tasks are shared: agents add and finish tasks in `tasks/` with `bun gooi task`,
  so the owner can follow along. Slices stay the owner's.
- Done means used: the owner used it for something real, recorded under Done.
- Nothing from `old/` or the deleted attempt comes back unless the open slice
  needs it. Docs inside `core/` may mention packages that no longer exist; that
  is history, not a to-do list.
- Keep this page to one screen. No ledgers, gate logs or "next" lists.

The owner updates the generated sections below through `bun gooi slice open`
and `bun gooi slice close --used`. Both use `.gooi/slices.json`. `bun gooi` and
the task pages (`bun run serve`: `/` and `/shadcn`) are generated: after changing
`apps/gooi/src/commands.ts`, `routes.ts` or `design.ts`, run `bun run compile`.

<!-- gooi:slices:start -->

## Open slice

**9. A second host: tasks and a room for nooq**

Apps don't know where they run; a host composes them, like a compose file. gooi's own wiring moves to hosts/gooi. A second host, hosts/nooq, composes the tasks and room apps for nooq: nooq's own task folder and room logs, Claude and OMLx with nooq's task tools, exposed as its own Commander CLI. The apps lose what only gooi needs, and the room checks that the log and agents it is given have the right contracts.

Done when: the owner uses the nooq CLI to track a real nooq task and talk it through with the agents, and the tasks and room apps hold no gooi-specific code.

## Done

- **8. Claude and OMLx in one room** (closed 2026-11-03). Used for: reviewed my ongoing conversation with both agents
- **7. Agent conversations on a swappable log** (closed 2026-11-03). Used for: reviewed my ongoing conversation with claude
- **6. Tell an agent, get a task** (closed 2026-11-03). Used for: used both backings to try enriching the rac ACP output
- **5. Task page in shadcn** (closed 2026-11-03). Used for: using shadcn now to monitor the list
- **4. See tasks in a browser** (closed 2026-11-03). Used for: monitor the task list as it updates live
- _…and 3 earlier._

<!-- gooi:slices:end -->
