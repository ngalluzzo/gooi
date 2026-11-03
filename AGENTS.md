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
- One open slice at a time. Agents work only on the open slice and stop when its
  done condition is met. Agents never open or choose the next slice.
- Done means used: the owner used it for something real, recorded under Done.
- Nothing from `old/` or the deleted attempt comes back unless the open slice
  needs it. Docs inside `core/` may mention packages that no longer exist; that
  is history, not a to-do list.
- Keep this page to one screen. No ledgers, gate logs or "next" lists.

The two sections below are written by `bun gooi` (`status`, `open`, `close --used`)
from `.gooi/slices.json`. Don't edit them by hand.

<!-- gooi:slices:start -->
## Open slice

_None. Only the owner opens the next slice._

## Done

- **1. Gooi tracks itself (CLI)** (closed 2026-11-03). Used for: to check the status of the project
<!-- gooi:slices:end -->
