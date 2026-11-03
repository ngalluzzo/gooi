import { artifact, observe } from "@gooi/kernel/evidence";
import { snapshot } from "@gooi/kernel/value";
import type { Artifact, Contract, Value } from "@gooi/kernel/types";
import type { Implementation } from "@gooi/exchange";

export const STATUS = Object.freeze({ id: "urn:gooi:slices:status", version: 1 });
export const OPEN = Object.freeze({ id: "urn:gooi:slices:open", version: 1 });
export const CLOSE = Object.freeze({ id: "urn:gooi:slices:close", version: 1 });
export const STATE = Object.freeze({ id: "urn:gooi:slices:state", version: 1 });
const APPLIED = Object.freeze({ id: "urn:gooi:slices:applied", version: 1 });
const TEXT_LIMIT = 2000;
const SHOWN = 5;

export interface Slice {
  readonly number: number;
  readonly title: string;
  readonly detail?: string;
  readonly done: string;
}
export interface ClosedSlice extends Slice {
  readonly used: string;
  readonly closed: string;
}
export interface State {
  readonly open: Slice | null;
  readonly done: readonly ClosedSlice[];
}
/** Where slice state lives. The host chooses it; edges never pick a path. */
export interface Store {
  read(): State;
  write(state: State): void;
}
export const EMPTY: State = Object.freeze({ open: null, done: Object.freeze([]) });

type Fields = { readonly [key: string]: Value };
function fields(
  value: Value | undefined,
  required: readonly string[],
  optional: readonly string[] = [],
): Fields {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a record");
  for (const key of Object.keys(value))
    if (!required.includes(key) && !optional.includes(key))
      throw new Error(`Unexpected field: ${key}`);
  for (const key of required)
    if (!Object.hasOwn(value, key)) throw new Error(`Missing field: ${key}`);
  return value as Fields;
}
function text(value: Value | undefined, name: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > TEXT_LIMIT)
    throw new Error(`Expected ${name} as text of 1 to ${TEXT_LIMIT} characters`);
  return value.trim();
}
function slice(value: Value | undefined, closed: boolean) {
  const base = ["number", "title", "done"];
  const v = fields(value, closed ? [...base, "used", "closed"] : base, ["detail"]);
  if (typeof v.number !== "number" || !Number.isSafeInteger(v.number) || v.number < 1)
    throw new Error("Expected a positive slice number");
  if (closed && (typeof v.closed !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(v.closed)))
    throw new Error("Expected the closed date as YYYY-MM-DD");
  return {
    number: v.number,
    title: text(v.title, "title"),
    ...(v.detail === undefined ? {} : { detail: text(v.detail, "detail") }),
    done: text(v.done, "done"),
    ...(closed ? { used: text(v.used, "used"), closed: v.closed as string } : {}),
  };
}

/** Admit stored state, including a hand-edited file. Slice numbers only increase. */
export function readState(value: unknown): State {
  const v = fields(snapshot(value), ["open", "done"]);
  if (!Array.isArray(v.done)) throw new Error("Expected a list of done slices");
  const done = v.done.map((item) => slice(item, true) as ClosedSlice);
  const open = v.open === null ? null : slice(v.open, false);
  const numbers = [...done, ...(open ? [open] : [])].map((s) => s.number);
  if (numbers.some((n, i) => i > 0 && n <= numbers[i - 1]!))
    throw new Error("Slice numbers must increase");
  return snapshot({ open, done }) as unknown as State;
}

function edge(input: Contract, scope: string, apply: (request: Value) => State): Implementation {
  return Object.freeze({
    operation: Object.freeze({ input, output: STATE }),
    async run(request: Artifact) {
      const output = artifact(STATE, apply(request.value));
      return {
        artifact: output,
        claims: [
          {
            contract: APPLIED,
            scope,
            from: [observe(request, input, "request", request.value)],
            to: [observe(output, STATE, "state", output.value)],
            verdict: "passed",
            witness: null,
          },
        ],
      };
    },
  });
}

function localDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** The three slice edges over a host-chosen store. `today` returns YYYY-MM-DD. */
export function slices(store: Store, today: () => string = localDate) {
  return Object.freeze({
    status: edge(STATUS, "Read the slice state; excludes later changes", (request) => {
      fields(request, []);
      return store.read();
    }),
    open: edge(OPEN, "Opened one slice and stored the resulting state; excludes later changes", (request) => {
      const v = fields(request, ["title", "done"], ["detail"]);
      const state = store.read();
      if (state.open)
        throw new Error(
          `Slice ${state.open.number} is still open. Close it, with what you used it for, before opening another.`,
        );
      const next = readState({
        open: { ...v, number: (state.done.at(-1)?.number ?? 0) + 1 },
        done: state.done,
      });
      store.write(next);
      return next;
    }),
    close: edge(CLOSE, "Closed the open slice with what it was used for and stored the resulting state; excludes later changes", (request) => {
      const { used } = fields(request, ["used"]);
      const state = store.read();
      if (!state.open) throw new Error("No slice is open.");
      const next = readState({
        open: null,
        done: [...state.done, { ...state.open, used, closed: today() }],
      });
      store.write(next);
      return next;
    }),
  });
}

/** The Open slice and Done sections as Markdown, showing the latest done slices first. */
export function render(state: State): string {
  const open = state.open
    ? [
        `**${state.open.number}. ${state.open.title}**`,
        ...(state.open.detail ? [state.open.detail] : []),
        `Done when: ${state.open.done}`,
      ].join("\n\n")
    : "_None. Only the owner opens the next slice._";
  const recent = state.done.slice(-SHOWN).reverse();
  const earlier = state.done.length - recent.length;
  const done = recent.length
    ? recent
        .map((s) => `- **${s.number}. ${s.title}** (closed ${s.closed}). Used for: ${s.used}`)
        .concat(earlier ? [`- _…and ${earlier} earlier._`] : [])
        .join("\n")
    : "_Nothing yet._";
  return ["## Open slice", open, "## Done", done].join("\n\n");
}
