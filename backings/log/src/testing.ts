import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import type { Value } from "@gooi/kernel/types";
import {
  LOG_APPEND, LOG_APPENDED, LOG_ENTRIES, LOG_LIST, LOG_READ, LOG_STREAMS, LogConflict,
  type Appended, type Log, type StreamInfo,
} from "./index.js";

export interface LogFixture {
  readonly log: Log;
  reopen(): Promise<Log>;
  dispose(): Promise<void>;
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
async function refuses(attempt: () => Promise<unknown>, what: string) {
  try {
    await attempt();
  } catch (error) {
    return error;
  }
  throw new Error(`${what}: expected a refusal`);
}

/** One law suite for every backing, exercised through exchange admission. */
export function logLaws(open: () => Promise<LogFixture>) {
  const law = (name: string, body: (fixture: LogFixture) => Promise<void>) => ({
    name,
    async run() {
      const fixture = await open();
      try {
        await body(fixture);
      } finally {
        await fixture.dispose();
      }
    },
  });
  async function append(log: Log, stream: string, expectedLength: number, entries: readonly Value[]) {
    const result = await invoke(log.append, artifact(LOG_APPEND, { stream, expectedLength, entries }));
    check(same(result.artifact.contract, LOG_APPENDED), "append returns its result contract");
    return result.artifact.value as unknown as Appended;
  }
  async function read(log: Log, stream: string, from = 0, limit?: number) {
    const result = await invoke(log.read, artifact(LOG_READ, {
      stream, from, ...(limit === undefined ? {} : { limit }),
    }));
    check(same(result.artifact.contract, LOG_ENTRIES), "read returns its result contract");
    return result.artifact.value;
  }
  async function list(log: Log) {
    const result = await invoke(log.list, artifact(LOG_LIST, {}));
    check(same(result.artifact.contract, LOG_STREAMS), "list returns its result contract");
    return result.artifact.value as unknown as StreamInfo[];
  }

  return [
    law("unwritten streams read empty and aren't listed", async ({ log }) => {
      check(same(await read(log, "never"), []), "unwritten stream should read empty");
      check(same(await list(log), []), "an empty log lists nothing");
    }),
    law("append batches land in order and survive reopening", async ({ log, reopen }) => {
      const entries = ["line\n二 🎉", { nested: [null, -2.5, true] }, 0, "", null];
      const first = await append(log, "s", 0, entries.slice(0, 2));
      const last = await append(log, "s", 2, entries.slice(2));
      check(first.stream === "s" && first.length === 2 && last.length === entries.length, "append returns stream and length");
      const again = await reopen();
      check(same(await read(again, "s"), entries), "exact JSON entries survive reopening in order");
      const [info, ...rest] = await list(again);
      check(info?.stream === "s" && info.length === entries.length && !rest.length, "list shows the stream and its length");
      check(new Date(info.updated).toISOString() === info.updated, "list gives an ISO update time");
    }),
    law("an incorrect expected length refuses the whole batch", async ({ log }) => {
      const missing = await refuses(() => append(log, "s", 1, [0]), "append past the end");
      check(missing instanceof LogConflict && missing.actual === 0, "unwritten stream conflicts at 0");
      check(same(await list(log), []), "a refused append creates no stream");
      await append(log, "s", 0, [1]);
      const before = await list(log);
      const stale = await refuses(() => append(log, "s", 0, [2, 3]), "append behind the end");
      check(stale instanceof LogConflict && stale.actual === 1, "stale append conflicts at 1");
      check(same(await read(log, "s"), [1]) && same(await list(log), before), "a conflict changes nothing");
    }),
    law("reads support a starting position and a limit", async ({ log }) => {
      await append(log, "s", 0, ["a", "b", "c"]);
      check(same(await read(log, "s", 1), ["b", "c"]), "from 1");
      check(same(await read(log, "s", 1, 1), ["b"]), "limit 1");
      check(same(await read(log, "s", 3), []), "from the end");
    }),
    law("racing appends at one expected length have one winner", async ({ log }) => {
      const settled = await Promise.allSettled(
        Array.from({ length: 6 }, (_, i) => append(log, "s", 0, [i, i])),
      );
      const winner = settled.findIndex((s) => s.status === "fulfilled");
      check(winner >= 0, "one writer must succeed");
      check(settled.every((s, i) => i === winner ||
        (s.status === "rejected" && s.reason instanceof LogConflict && s.reason.actual === 2)),
      "other writers must conflict with the full batch");
      check(same(await read(log, "s"), [winner, winner]), "only the winning batch is visible");
    }),
    law("stream names are independent, case-sensitive and sorted", async ({ log }) => {
      await append(log, "a", 0, ["lower"]);
      await append(log, "A", 0, ["upper"]);
      check(same(await read(log, "a"), ["lower"]), "lowercase name reads its own entries");
      check(same(await read(log, "A"), ["upper"]), "uppercase name reads its own entries");
      check(same((await list(log)).map((s) => s.stream), ["A", "a"]), "list is ordered by name");
    }),
    law("invalid names, positions and batches are refused", async ({ log }) => {
      for (const name of ["", "../up", "a/b", ".hidden", "a b", "a\n"])
        await refuses(() => append(log, name, 0, [1]), JSON.stringify(name));
      await refuses(() => read(log, "../up"), "reading a bad name");
      await refuses(() => read(log, "s", -1), "reading a negative position");
      await refuses(() => append(log, "s", 0, []), "an empty append");
      await refuses(() => append(log, "s", -1, [1]), "a negative expected length");
      await refuses(() => append(log, "s", 0, [undefined as never]), "a non-JSON entry");
      check(same(await list(log), []), "nothing was written");
    }),
  ];
}
