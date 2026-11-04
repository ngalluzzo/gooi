import type { Filter, Relation, Row } from "@gooi/duckdb";

// A repository's issues as a query relation, over GitHub's `issues/list-for-repo`
// operation (GET /repos/{owner}/{repo}/issues). Filters become GitHub's own
// query parameters; openapi-issues.json is the operation as GitHub publishes
// it, and the tests check the relation against it. Pull requests share the
// endpoint and are left out: this relation is issues.

export interface IssuesOptions {
  /** "owner/name". */
  readonly repo: string;
  /** Read when a query runs. Public repositories work without one, at a lower rate limit. */
  readonly token?: () => string | undefined;
  readonly fetch?: typeof fetch;
  readonly baseUrl?: string;
  /** Pages of 100 issues to read at most; a query that needs more fails rather than reading part. */
  readonly maxPages?: number;
}

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  user: { login: string } | null;
  labels: ({ name?: string } | string)[];
  assignees?: { login: string }[] | null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
  pull_request?: unknown;
}

/** The parameters for the filters GitHub can apply, and which filters they cover. */
export function parameters(filters: readonly Filter[]) {
  const params = new URLSearchParams();
  const used: Filter[] = [];
  const state = filters.find((f) => f.column === "state" && f.op === "=" && (f.value === "open" || f.value === "closed"));
  // GitHub returns only open issues unless asked: without a state filter, ask for all.
  params.set("state", state ? String(state.value) : "all");
  if (state) used.push(state);
  const author = filters.find((f) => f.column === "author" && f.op === "=" && typeof f.value === "string");
  if (author) { params.set("creator", String(author.value)); used.push(author); }
  const assignee = filters.find((f) => f.column === "assignees" && f.op === "contains" && typeof f.value === "string");
  if (assignee) { params.set("assignee", String(assignee.value)); used.push(assignee); }
  // GitHub returns issues with all the labels listed, so every label filter can go; a name with a comma can't.
  const labels = filters.filter((f) => f.column === "labels" && f.op === "contains" && typeof f.value === "string" && !String(f.value).includes(","));
  if (labels.length) { params.set("labels", labels.map((f) => String(f.value)).join(",")); used.push(...labels); }
  // `since` means updated after the time; a second earlier keeps issues updated exactly then.
  const since = filters
    .filter((f) => f.column === "updated_at" && (f.op === ">=" || f.op === ">") && typeof f.value === "string" && !Number.isNaN(Date.parse(String(f.value))))
    .sort((a, b) => Date.parse(String(b.value)) - Date.parse(String(a.value)))[0];
  if (since) { params.set("since", new Date(Date.parse(String(since.value)) - 1000).toISOString()); used.push(since); }
  return { params, used };
}

/** The next page's URL from a Link header, if there is one. */
function nextPage(link: string | null): string | undefined {
  for (const part of (link ?? "").split(","))
    if (/rel="next"/u.test(part)) return part.match(/<([^>]+)>/u)?.[1];
  return undefined;
}

export function issues(options: IssuesOptions): Relation {
  if (!REPO.test(options.repo)) throw new Error(`Expected a repository as owner/name: "${options.repo}"`);
  const request = options.fetch ?? fetch;
  const base = options.baseUrl ?? "https://api.github.com";
  const maxPages = options.maxPages ?? 50;
  return {
    schema: { fields: [
      { name: "number", type: "integer" },
      { name: "title", type: "string" },
      { name: "state", type: "string", description: "open or closed" },
      { name: "author", type: "string" },
      { name: "labels", type: "array" },
      { name: "assignees", type: "array" },
      { name: "comments", type: "integer" },
      { name: "created_at", type: "datetime" },
      { name: "updated_at", type: "datetime" },
      { name: "closed_at", type: "datetime" },
      { name: "url", type: "string" },
    ] },
    pushable: { state: ["="], author: ["="], assignees: ["contains"], labels: ["contains"], updated_at: [">=", ">"] },
    async fetch(filters) {
      const { params } = parameters(filters);
      params.set("per_page", "100");
      const token = options.token?.();
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "gooi",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const rows: Row[] = [];
      let url: string | undefined = `${base}/repos/${options.repo}/issues?${params}`;
      for (let page = 1; url; page++) {
        if (page > maxPages) throw new Error(`${options.repo} has more than ${maxPages} pages of issues for this query; filter it further`);
        const response = await request(url, { headers });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({})) as { message?: string };
          throw new Error(`GitHub answered ${response.status} for ${options.repo}'s issues${detail.message ? `: ${detail.message}` : ""}`);
        }
        for (const issue of await response.json() as GitHubIssue[]) {
          if (issue.pull_request) continue;
          rows.push({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            author: issue.user?.login ?? null,
            labels: issue.labels.map((label) => typeof label === "string" ? label : label.name ?? "").filter(Boolean),
            assignees: (issue.assignees ?? []).map((user) => user.login),
            comments: issue.comments,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            closed_at: issue.closed_at,
            url: issue.html_url,
          });
        }
        url = nextPage(response.headers.get("link"));
      }
      return rows;
    },
  };
}
