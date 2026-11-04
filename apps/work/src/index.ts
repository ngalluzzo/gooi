import { TABLE, type DuckDB, type Relation, type Table } from "@gooi/duckdb";
import { edge, invoke, type Implementation } from "@gooi/exchange";
import { HAST } from "@gooi/hast";
import { artifact } from "@gooi/kernel/evidence";
import type { Value } from "@gooi/kernel/types";
import { page } from "./page.js";

export { TABLE } from "@gooi/duckdb";

const contract = (name: string) => Object.freeze({ id: `urn:gooi:work:${name}`, version: 1 });
export const MARKDOWN = Object.freeze({ id: "https://www.iana.org/assignments/media-types/text/markdown", version: 1 });

/** Every task and issue, open first, newest first. */
export const ALL = `
SELECT 'task' AS kind, name AS ref, title, status, created, finished AS closed, NULL::VARCHAR AS url FROM tasks
UNION ALL
SELECT 'issue', '#' || number, title, state, created_at::DATE, closed_at::DATE, url FROM issues
ORDER BY status IN ('done', 'closed'), created DESC, ref`;

/** Open tasks and open issues. The issues' state filter is pushed down to GitHub. */
export const OPEN = `
SELECT 'task' AS kind, name AS ref, title, created, NULL::VARCHAR AS url FROM tasks WHERE status = 'open'
UNION ALL
SELECT 'issue', '#' || number, title, created_at::DATE, url FROM issues WHERE state = 'open'
ORDER BY created DESC, ref`;

export interface WorkOptions {
  readonly engine: Pick<DuckDB, "query">;
  /** An edge giving the tasks as a table when invoked with {}. */
  readonly tasks: Implementation;
  readonly issues: Relation;
  /** Named for the page title, such as "gooi". */
  readonly project: string;
}

export type Answer = Table & { readonly pushdown: Record<string, { readonly filters: readonly unknown[]; readonly rows: number }> };

/** Work across Markdown tasks (a local table) and GitHub issues (a relation):
 * one query over both, saved queries, and two views of any answer. */
export function work({ engine, tasks, issues, project }: WorkOptions) {
  async function run(sql: string): Promise<Value> {
    const listed = await invoke(tasks, artifact(tasks.operation.input, {}));
    const answer = await engine.query(sql, { tables: { tasks: listed.artifact.value as unknown as Table }, relations: { issues } });
    return { ...answer.table, pushdown: answer.pushed } as unknown as Value;
  }

  const query = edge({
    operation: { input: contract("query"), output: TABLE },
    inputSchema: {
      type: "object",
      description: `Query ${project}'s tasks and GitHub issues with one SQL SELECT; tasks and issues are the tables`,
      properties: {
        sql: {
          type: "string", minLength: 1, maxLength: 20000,
          description: "One SELECT over tasks (name, title, status, created, finished) and issues (number, title, state, author, labels, assignees, comments, created_at, updated_at, closed_at, url)",
        },
      },
      required: ["sql"],
      additionalProperties: false,
    },
    claim: contract("queried"),
    scope: "Ran one SELECT in DuckDB over the tasks and the issues GitHub returned for the filters pushed down to it; DuckDB applied every filter again",
  }, (input) => run((input.value as { sql: string }).sql));

  const saved = (name: string, description: string, sql: string) => edge({
    operation: { input: contract(name), output: TABLE },
    inputSchema: { type: "object", description, properties: {}, additionalProperties: false },
    claim: contract("queried"),
    scope: `Ran the saved "${name}" query in DuckDB over the tasks and the issues GitHub returned`,
  }, () => run(sql));

  const markdown = edge({
    operation: { input: TABLE, output: MARKDOWN },
    claim: contract("tabled-markdown"),
    scope: "Wrote the answer as one GitHub-flavored Markdown table, with a separator cell per column",
  }, (input) => markdownTable(input.value as unknown as Answer));

  const html = edge({
    operation: { input: TABLE, output: HAST },
    claim: contract("tabled-html"),
    scope: "Rendered the answer as an HTML page with one table; every value is a text node, and only http(s) URLs become links",
  }, (input) => page(input.value as unknown as Answer, project) as unknown as Value);

  return {
    query,
    all: saved("all", `All of ${project}'s tasks and GitHub issues, open first`, ALL),
    open: saved("open", `${project}'s open tasks and open GitHub issues`, OPEN),
    markdown,
    html,
  };
}

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return text.replace(/\\/gu, "\\\\").replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");
};

/** The answer as a GitHub-flavored Markdown table: one separator cell per column. */
export function markdownTable(answer: Table): string {
  const names = answer.schema.fields.map((field) => field.name);
  if (!names.length) return "";
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [
    line(names.map(cell)),
    line(names.map(() => "---")),
    ...answer.data.map((row) => line(names.map((name) => cell(row[name])))),
  ].join("\n");
}
