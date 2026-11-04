import type { Element, ElementContent, Root } from "hast";
import type { Answer } from "./index.js";

const STYLE = `
:root { color-scheme: light dark; --soft: #6b7280; --line: #e5e7eb; }
@media (prefers-color-scheme: dark) { :root { --soft: #9ca3af; --line: #374151; } }
body { font: 15px/1.5 system-ui, sans-serif; margin: 0; }
main { max-width: 64rem; margin: 0 auto; padding: 2rem 1rem; }
h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
.summary { color: var(--soft); margin: 0 0 1.25rem; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: var(--soft); }
footer { color: var(--soft); font-size: .85rem; margin-top: 1.25rem; }
`;

const text = (value: string): ElementContent => ({ type: "text", value });
const el = (tagName: string, properties: Element["properties"], children: ElementContent[]): Element =>
  ({ type: "element", tagName, properties, children });

function value(raw: unknown): ElementContent[] {
  if (raw === null || raw === undefined) return [];
  const shown = Array.isArray(raw) ? raw.join(", ") : String(raw);
  // Only http and https URLs become links; anything else, javascript: included, stays text.
  if (typeof raw === "string" && /^https?:\/\/[^\s]+$/u.test(raw)) return [el("a", { href: raw }, [text("open")])];
  return [text(shown)];
}

/** The answer as an HTML page. Every value from the query is a text node or a
 * checked link; markup only comes from this function's constants. */
export function page(answer: Answer, project: string): Root {
  const names = answer.schema.fields.map((field) => field.name);
  const pushed = Object.entries(answer.pushdown ?? {}).map(([source, { filters, rows }]) =>
    `${source}: ${rows} fetched${filters.length ? ` with ${filters.length} filter${filters.length === 1 ? "" : "s"} pushed down` : ""}`);
  return {
    type: "root",
    children: [
      { type: "doctype" },
      el("html", { lang: "en" }, [
        el("head", {}, [
          el("meta", { charSet: "utf-8" }, []),
          el("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }, []),
          el("title", {}, [text(`${project}: work`)]),
          el("style", {}, [text(STYLE)]),
        ]),
        el("body", {}, [
          el("main", {}, [
            el("h1", {}, [text(`${project}: work`)]),
            el("p", { className: ["summary"] }, [text(`${answer.data.length} rows from one query over tasks and GitHub issues`)]),
            el("div", { className: ["scroll"] }, [
              el("table", {}, [
                el("thead", {}, [el("tr", {}, names.map((name) => el("th", {}, [text(name)])))]),
                el("tbody", {}, answer.data.map((row) => el("tr", {}, names.map((name) => el("td", {}, value(row[name])))))),
              ]),
            ]),
            el("footer", {}, [text(pushed.join(" · "))]),
          ]),
        ]),
      ]),
    ],
  };
}
