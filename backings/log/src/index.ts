import type { EdgeOptions, Implementation } from "@gooi/exchange";
import type { Value } from "@gooi/kernel/types";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

const contract = (name: string) => Object.freeze({ id: `urn:gooi:log:${name}`, version: 1 });

export const LOG_APPEND = contract("append");
export const LOG_APPENDED = contract("appended");
export const LOG_READ = contract("read");
export const LOG_ENTRIES = contract("entries");
export const LOG_LIST = contract("list");
export const LOG_STREAMS = contract("streams");

/** A host binding for the three operations. Calls go through exchange.invoke. */
export interface Log {
  /** Commit a complete batch at the expected length, or throw LogConflict without appending. */
  readonly append: Implementation;
  /** Read committed entries in append order. An unwritten stream reads empty. */
  readonly read: Implementation;
  /** Read stream lengths and last append times, ordered by stream name. */
  readonly list: Implementation;
}

const stream = { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}(?![\\s\\S])" } as const;
const position = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;

// Each request is described once, in JSON Schema; its type is derived from it.
const appendInput = {
  type: "object",
  description: "Append JSON entries to a named log stream at its expected length",
  properties: { stream, expectedLength: position, entries: { type: "array", minItems: 1 } },
  required: ["stream", "expectedLength", "entries"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const readInput = {
  type: "object",
  description: "Read a named stream in append order, starting at a zero-based position",
  properties: { stream, from: position, limit: position },
  required: ["stream"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listInput = {
  type: "object",
  description: "List written streams with their length and last append time",
  additionalProperties: false,
} as const satisfies JSONSchema;

// The schema accepts any items; the log stores JSON values.
export type AppendRequest = FromSchema<typeof appendInput> & { readonly entries: readonly Value[] };
export type ReadRequest = FromSchema<typeof readInput>;

// Outputs have no schema yet, so these are their only description.
export interface Appended {
  readonly stream: string;
  readonly length: number;
}

export interface StreamInfo extends Appended {
  readonly updated: string;
}

/** The write was refused before appending. Other I/O errors may leave its outcome uncertain. */
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

export const appendSpec: EdgeOptions = {
  operation: { input: LOG_APPEND, output: LOG_APPENDED },
  inputSchema: appendInput,
  claim: contract("committed"),
  scope: "Appended the entire batch in order at the expected length and committed it to the host-bound log",
};

export const readSpec: EdgeOptions = {
  operation: { input: LOG_READ, output: LOG_ENTRIES },
  inputSchema: readInput,
  claim: contract("read-entries"),
  scope: "Observed the requested range of committed entries in order; an unwritten stream reads empty",
};

export const listSpec: EdgeOptions = {
  operation: { input: LOG_LIST, output: LOG_STREAMS },
  inputSchema: listInput,
  claim: contract("listed-streams"),
  scope: "Observed the written streams, their lengths and ISO last append times, ordered by stream name",
};
