import { LogConflict, type Log } from "./index.js";

/** A fresh, empty log for one law, a way to reopen the same storage as a new
 * instance (as after a restart), and cleanup. */
export interface LogFixture {
  readonly log: Log;
  reopen(): Promise<Log>;
  dispose(): Promise<void>;
}
export interface Law {
  readonly name: string;
  run(): Promise<void>;
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
async function refuses(attempt: () => Promise<unknown>, what: string, conflict = false) {
  try {
    await attempt();
  } catch (error) {
    if (conflict) check(error instanceof LogConflict, `${what}: expected a LogConflict, got ${error}`);
    return;
  }
  throw new Error(`${what}: expected a refusal`);
}

/** The laws every log backing must pass, independent of any test runner:
 * `for (const law of logLaws(open)) test(law.name, law.run)`. */
export function logLaws(open: () => Promise<LogFixture>): Law[] {
  const law = (name: string, body: (fixture: LogFixture) => Promise<void>): Law => ({
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
  return [
    law("a stream that was never written reads empty and isn't listed", async ({ log }) => {
      check(same(await log.read("never"), []), "unwritten stream should read empty");
      check(same(await log.list(), []), "an empty log lists nothing");
    }),
    law("appends land in order and survive reopening", async ({ log, reopen }) => {
      check((await log.append("s", 0, [{ n: 1 }, { n: 2 }])) === 2, "first append returns 2");
      check((await log.append("s", 2, [{ n: 3 }])) === 3, "second append returns 3");
      const expected = [{ n: 1 }, { n: 2 }, { n: 3 }];
      check(same(await log.read("s"), expected), "entries read back in order");
      const again = await reopen();
      check(same(await again.read("s"), expected), "entries survive reopening");
      const [info, ...rest] = await again.list();
      check(info?.stream === "s" && info.length === 3 && !rest.length, "list shows the stream and its length");
      check(!Number.isNaN(Date.parse(info.updated)), "list gives an ISO update time");
    }),
    law("a wrong expected length is refused and writes nothing", async ({ log }) => {
      await refuses(() => log.append("s", 1, [{ n: 1 }]), "append past the end", true);
      check(same(await log.read("s"), []), "the refused append wrote nothing");
      await log.append("s", 0, [{ n: 1 }]);
      await refuses(() => log.append("s", 0, [{ n: 2 }]), "append behind the end", true);
      check(same(await log.read("s"), [{ n: 1 }]), "still one entry");
    }),
    law("reading from a position returns the rest", async ({ log }) => {
      await log.append("s", 0, ["a", "b", "c"]);
      check(same(await log.read("s", 1), ["b", "c"]), "from 1");
      check(same(await log.read("s", 3), []), "from the end");
    }),
    law("racing appends with the same expected length: exactly one wins", async ({ log }) => {
      const settled = await Promise.allSettled(
        Array.from({ length: 6 }, (_, i) => log.append("race", 0, [{ i }])),
      );
      const won = settled.filter((s) => s.status === "fulfilled");
      check(won.length === 1, `one append should win, ${won.length} did`);
      check(
        settled.every((s) => s.status === "fulfilled" || s.reason instanceof LogConflict),
        "the losers are conflicts",
      );
      check((await log.read("race")).length === 1, "exactly one entry");
    }),
    law("entries keep their exact JSON values", async ({ log, reopen }) => {
      const entry = {
        text: "line one\nline \"two\" — ünïcode ✓ 🎉",
        nested: { list: [1, -2.5, 1e21, null, true], empty: {} },
      };
      await log.append("s", 0, [entry, "", 0, null]);
      check(same(await (await reopen()).read("s"), [entry, "", 0, null]), "values round-trip");
    }),
    law("streams are independent and listed by name", async ({ log }) => {
      await log.append("b", 0, [1]);
      await log.append("a", 0, [1, 2]);
      const listed = (await log.list()).map((s) => [s.stream, s.length]);
      check(same(listed, [["a", 2], ["b", 1]]), `listed ${JSON.stringify(listed)}`);
    }),
    law("refuses names and values it can't store safely", async ({ log }) => {
      for (const name of ["", "../up", "a/b", ".hidden", "a b"])
        await refuses(() => log.append(name, 0, [1]), `stream name ${JSON.stringify(name)}`);
      await refuses(() => log.read("../up"), "reading a bad name");
      await refuses(() => log.append("s", 0, []), "an empty append");
      await refuses(() => log.append("s", -1, [1]), "a negative expected length");
      await refuses(() => log.append("s", 0, [{ f: () => 1 } as never]), "a non-JSON entry");
      check(same(await log.list(), []), "nothing was written");
    }),
  ];
}
