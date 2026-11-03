import { createHash } from "node:crypto";
import { edge } from "@gooi/exchange";
import type { Jsonl } from "@gooi/jsonl";
import type { Value } from "@gooi/kernel/types";
import {
  appendSpec, listSpec, LogConflict, readSpec, type AppendRequest, type Log, type ReadRequest,
} from "./index.js";

type Batch = {
  stream: string;
  updated: string;
  entries: readonly Value[];
};

function filename(stream: string): string {
  // Preserve case-sensitive stream identity even on case-insensitive filesystems.
  return createHash("sha256").update(stream).digest("hex") + ".jsonl";
}

function batches(name: string, records: readonly Value[]) {
  const batches = records as readonly Batch[];
  const first = batches[0];
  if (batches.length && (typeof first?.stream !== "string" || filename(first.stream) !== name))
    throw new Error(`Invalid JSONL stream in ${name}`);
  for (const batch of batches) {
    if (batch?.stream !== first?.stream || typeof batch?.updated !== "string" ||
        !Array.isArray(batch?.entries) || !batch.entries.length)
      throw new Error(`Invalid JSONL batch in ${name}`);
  }
  return batches;
}

const entryCount = (batches: readonly Batch[]) =>
  batches.reduce((sum, batch) => sum + batch.entries.length, 0);

/** Lower the log contract to named JSONL files with one record per batch. */
export function jsonlLog(files: Jsonl): Log {
  return {
    append: edge(appendSpec, (input) => {
      const { stream, expectedLength, entries } = input.value as unknown as AppendRequest;
      const name = filename(stream);
      return files.append(name, (records) => {
        const current = entryCount(batches(name, records));
        if (current !== expectedLength) throw new LogConflict(stream, expectedLength, current);
        const record: Batch = { stream, updated: new Date().toISOString(), entries };
        return { record, result: { stream, length: current + entries.length } };
      });
    }),
    read: edge(readSpec, async (input) => {
      const { stream, from = 0, limit } = input.value as unknown as ReadRequest;
      const name = filename(stream);
      const entries = batches(name, await files.read(name)).flatMap((batch) => batch.entries);
      return entries.slice(from, limit === undefined ? undefined : from + limit);
    }),
    list: edge(listSpec, async () => {
      const snapshot = await files.scan((name) => /^[0-9a-f]{64}\.jsonl$/u.test(name));
      const streams = snapshot.flatMap(({ name, records }) => {
        const stored = batches(name, records);
        const last = stored.at(-1);
        return last ? [{ stream: last.stream, length: entryCount(stored), updated: last.updated }] : [];
      });
      return streams.sort((a, b) => a.stream < b.stream ? -1 : a.stream > b.stream ? 1 : 0);
    }),
  };
}
