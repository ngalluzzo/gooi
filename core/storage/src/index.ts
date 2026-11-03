import { snapshot } from "@gooi/kernel/value";
import type { Value } from "@gooi/kernel/types";

/** An append-only log of JSON entries in named streams. The interface has no
 * queries: anything more is an edge that reads and derives. */
export interface Log {
  /** Append entries if the stream has exactly `expected` entries, otherwise
   * refuse with LogConflict and write nothing. Returns the new length. */
  append(stream: string, expected: number, entries: readonly Value[]): Promise<number>;
  /** Entries from position `from` (0 by default), in order. A stream that was
   * never written reads as empty. */
  read(stream: string, from?: number): Promise<Value[]>;
  /** Every written stream with its length and last append time, by name. */
  list(): Promise<StreamInfo[]>;
}
export interface StreamInfo {
  readonly stream: string;
  readonly length: number;
  /** ISO 8601 time of the last append. */
  readonly updated: string;
}

/** The stream's length wasn't what the append expected. */
export class LogConflict extends Error {
  override readonly name = "LogConflict";
  constructor(
    readonly stream: string,
    readonly expected: number,
    readonly actual: number,
  ) {
    super(`Stream ${stream} has ${actual} entries, not the expected ${expected}`);
  }
}

const STREAM = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/u;

/** A stream name safe for every backing: letters, digits, _ . -, starting
 * with a letter or digit, so it can't name a path outside a folder. */
export function streamName(stream: unknown): string {
  if (typeof stream !== "string" || !STREAM.test(stream))
    throw new Error(`Not a stream name: ${JSON.stringify(stream)}`);
  return stream;
}

/** Check an append's arguments the same way for every backing. */
export function appendArguments(stream: unknown, expected: unknown, entries: unknown) {
  if (typeof expected !== "number" || !Number.isSafeInteger(expected) || expected < 0)
    throw new Error("The expected length must be a non-negative integer");
  if (!Array.isArray(entries) || !entries.length) throw new Error("Append at least one entry");
  return { stream: streamName(stream), expected, entries: entries.map((entry) => snapshot(entry)) };
}
