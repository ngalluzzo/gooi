import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Digest, Value } from "./types.js";

const utf8 = new TextEncoder();

/** Encode only admitted values. No object serialization hooks are consulted. */
export function encode(value: Value): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(encode).join(",")}]`;
  const record = value as { readonly [key: string]: Value };
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${encode(record[key]!)}`)
    .join(",")}}`;
}

/** Internal identity framing may add fields around an already admitted value.
 * The caller must supply only detached JSON; public entry points admit first. */
export function digestSnapshot(value: Value): Digest {
  return `sha256:${bytesToHex(sha256(utf8.encode(encode(value))))}`;
}
