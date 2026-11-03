import { edge, type Implementation } from "@gooi/exchange";
import type { Value } from "@gooi/kernel/types";
import { HAST } from "@gooi/hast";
import { TASKS, type Listing, type Task } from "./index.js";

const RENDERED = Object.freeze({ id: "urn:gooi:tasks:rendered", version: 1 });

type Node = { readonly type: string; readonly [key: string]: Value };
const text = (value: string): Node => ({ type: "text", value });
const el = (tagName: string, properties: Record<string, Value>, children: Node[]): Node => ({
  type: "element",
  tagName,
  properties,
  children,
});

const STYLE = `
:root { color-scheme: light dark; --ink: #1d1d1f; --soft: #6e6e73; --line: #d2d2d7; --page: #fbfbfd; }
@media (prefers-color-scheme: dark) { :root { --ink: #f5f5f7; --soft: #a1a1a6; --line: #3a3a3c; --page: #161617; } }
body { margin: 0; background: var(--page); color: var(--ink); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 42rem; margin: 0 auto; padding: 2rem 1rem 3rem; }
h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
h2 { font-size: 1rem; margin: 2rem 0 .5rem; color: var(--soft); text-transform: uppercase; letter-spacing: .04em; }
ul { list-style: none; margin: 0; padding: 0; }
li { padding: .6rem 0; border-top: 1px solid var(--line); }
.title { display: block; font-weight: 600; overflow-wrap: anywhere; }
.done .title { font-weight: 400; color: var(--soft); text-decoration: line-through; }
.meta, .summary, footer { color: var(--soft); font-size: .875rem; }
footer { margin-top: 2.5rem; }
.problem { color: #c9342b; }
`;

function item(task: Task, kind: "open" | "done"): Node {
  const when = kind === "open" ? `created ${task.created}` : `finished ${task.finished ?? task.created}`;
  return el("li", { className: [kind] }, [
    el("span", { className: ["title"] }, [text(task.title)]),
    el("span", { className: ["meta"] }, [text(`${task.name} · ${when}`)]),
  ]);
}
function section(heading: string, items: Node[], empty: string): Node[] {
  return [el("h2", {}, [text(heading)]), items.length ? el("ul", {}, items) : el("p", { className: ["meta"] }, [text(empty)])];
}

/** The task page as a hast document. Every value from task files becomes a
 * text node; markup only ever comes from this function's constants. */
export function page(listing: Listing): Node {
  const { open, done, unreadable } = listing;
  return {
    type: "root",
    children: [
      { type: "doctype" },
      el("html", { lang: "en" }, [
        el("head", {}, [
          el("meta", { charSet: "utf-8" }, []),
          el("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }, []),
          el("meta", { httpEquiv: ["refresh"], content: "5" }, []),
          el("title", {}, [text(`Tasks (${open.length} open)`)]),
          el("style", {}, [text(STYLE)]),
        ]),
        el("body", {}, [
          el("main", {}, [
            el("h1", {}, [text("Tasks")]),
            el("p", { className: ["summary"] }, [text(`${open.length} open · ${done.length} done`)]),
            ...section("Open", open.map((t) => item(t, "open")), "Nothing open."),
            ...section("Done", done.map((t) => item(t, "done")), "Nothing done yet."),
            ...(unreadable.length
              ? section(
                  "Can't read",
                  unreadable.map((u) =>
                    el("li", {}, [
                      el("span", { className: ["title"] }, [text(`${u.name}.md`)]),
                      el("span", { className: ["meta", "problem"] }, [text(u.problem)]),
                    ]),
                  ),
                  "",
                )
              : []),
            el("footer", {}, [text("Refreshes every 5 seconds.")]),
          ]),
        ]),
      ]),
    ],
  };
}

/** Render the task listing as a hast document. */
export const renderTasks: Implementation = edge(
  {
    operation: { input: TASKS, output: HAST },
    inputSchema: {
      type: "object",
      required: ["open", "done", "unreadable"],
      properties: { open: { type: "array" }, done: { type: "array" }, unreadable: { type: "array" } },
    },
    claim: RENDERED,
    scope:
      "Rendered this exact task listing as a hast document whose task text is all text nodes; excludes how a browser displays it",
  },
  (input) => page(input.value as unknown as Listing),
);
