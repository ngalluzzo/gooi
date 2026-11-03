export type Status = "open" | "done";
export interface Task {
  readonly name: string;
  readonly title: string;
  readonly status: Status;
  readonly created: string;
  readonly finished?: string;
}

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const HEADER_LINE = /^([a-z][a-z0-9_-]*):[ \t]*(.*)$/u;

export function readName(name: unknown): string {
  if (typeof name !== "string" || name.length > 80 || !NAME.test(name))
    throw new Error(
      `Expected a file name of lowercase words joined by hyphens, got ${JSON.stringify(name)}`,
    );
  return name;
}

/** A file name for a title: lowercase words joined by hyphens, at most 60
 * characters. Empty when the title has no letters or digits. */
export function nameFor(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 60)
    .replace(/-+$/u, "");
}

function parse(name: string, text: string) {
  if (text.includes("\r")) throw new Error("Expected Unix line endings");
  const lines = text.split("\n");
  if (lines[0] !== "---")
    throw new Error("Expected the file to start with a --- header");
  const close = lines.indexOf("---", 1);
  if (close < 0) throw new Error("Expected the header to end with ---");
  const header = new Map<string, number>(),
    values = new Map<string, string>();
  for (let i = 1; i < close; i++) {
    const match = HEADER_LINE.exec(lines[i]!);
    if (!match) throw new Error(`Unreadable header line ${i + 1}: ${lines[i]}`);
    const key = match[1]!;
    if (header.has(key)) throw new Error(`Repeated header key: ${key}`);
    header.set(key, i);
    values.set(key, match[2]!.trim());
  }
  const status = values.get("status"),
    created = values.get("created") ?? "",
    finished = values.get("finished");
  if (status !== "open" && status !== "done")
    throw new Error("Expected status: open or status: done");
  if (!DATE.test(created)) throw new Error("Expected created: YYYY-MM-DD");
  if (finished !== undefined && !DATE.test(finished))
    throw new Error("Expected finished: YYYY-MM-DD");
  const heading = lines.slice(close + 1).find((line) => line.trim());
  const title = heading?.startsWith("# ") ? heading.slice(2).trim() : "";
  if (!title) throw new Error("Expected a # title after the header");
  const task: Task = {
    name,
    title,
    status,
    created,
    ...(finished === undefined ? {} : { finished }),
  };
  return { lines, close, header, task };
}

/** Read a task file's header and title. Unknown header keys are allowed and kept. */
export function readTask(name: string, text: string): Task {
  return parse(readName(name), text).task;
}

/** The text of a new open task. */
export function taskText(
  title: string,
  created: string,
  notes?: string,
): string {
  return `${["---", "status: open", `created: ${created}`, "---", `# ${title}`, ...(notes ? ["", notes] : [])].join("\n")}\n`;
}

/** Mark an open task done. Only header lines change; the title and notes keep
 * their exact bytes. */
export function finishText(name: string, text: string, date: string): string {
  const { lines, close, header, task } = parse(readName(name), text);
  if (task.status === "done") throw new Error(`Task ${name} is already done`);
  const next = [...lines];
  next[header.get("status")!] = "status: done";
  const finished = header.get("finished");
  if (finished === undefined) next.splice(close, 0, `finished: ${date}`);
  else next[finished] = `finished: ${date}`;
  return next.join("\n");
}
