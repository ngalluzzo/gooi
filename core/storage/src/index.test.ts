import { describe, expect, test } from "bun:test";
import type { Value } from "@gooi/kernel/types";
import { LogConflict, appendArguments, streamName, type Log } from "./index.js";
import { logLaws, type LogFixture } from "./testing.js";

// A test-only reference log. Each `flaw` breaks one promise, so we can check
// that the laws notice.
type Flaw = "no-check" | "reversed" | "forgets" | "any-name" | "no-race";
function memory(flaw?: Flaw) {
  const streams = new Map<string, { entries: Value[]; updated: string }>();
  const make = (): Log => ({
    async append(rawStream, expected, rawEntries) {
      const { stream, entries } =
        flaw === "any-name"
          ? { stream: rawStream, entries: rawEntries as Value[] }
          : appendArguments(rawStream, expected, rawEntries);
      const current = streams.get(stream)?.entries ?? [];
      if (flaw === "no-race") await Promise.resolve();
      if (flaw !== "no-check" && current.length !== expected)
        throw new LogConflict(stream, expected, current.length);
      const next = flaw === "reversed" ? [...entries, ...current] : [...current, ...entries];
      streams.set(stream, { entries: next, updated: new Date().toISOString() });
      return next.length;
    },
    async read(stream, from = 0) {
      if (flaw !== "any-name") streamName(stream);
      return (streams.get(stream)?.entries ?? []).slice(from);
    },
    async list() {
      return [...streams]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([stream, { entries, updated }]) => ({ stream, length: entries.length, updated }));
    },
  });
  return async (): Promise<LogFixture> => ({
    log: make(),
    reopen: async () => {
      if (flaw === "forgets") streams.clear();
      return make();
    },
    dispose: async () => streams.clear(),
  });
}

describe("log laws", () => {
  for (const law of logLaws(memory())) test(law.name, law.run);
});

describe("the laws catch broken logs", () => {
  for (const flaw of ["no-check", "reversed", "forgets", "any-name", "no-race"] as const)
    test(`a log that ${flaw} fails at least one law`, async () => {
      const results = await Promise.allSettled(logLaws(memory(flaw)).map((law) => law.run()));
      expect(results.some((r) => r.status === "rejected")).toBe(true);
    });
});
