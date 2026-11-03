import type { Digest, Value } from "./types.js";
import { ensure } from "./assert.js";
import { encode, digestSnapshot } from "./identity.js";

export const VALUE_LIMITS = Object.freeze({
  depth: 64,
  nodes: 100_000,
  bytes: 4 * 1024 * 1024,
});
const utf8 = new TextEncoder();
const surrogate =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;

/** Copy decoded data without invoking accessors or serialization hooks. */
export function snapshot(value: unknown): Value {
  let nodes = 0,
    bytes = 0;
  const ancestors = new Set<object>();
  function charge(size: number) {
    bytes += size;
    ensure(
      bytes <= VALUE_LIMITS.bytes,
      "limit-exceeded",
      "Value exceeds its byte limit",
    );
  }
  function string(value: string) {
    ensure(
      !surrogate.test(value),
      "invalid-value",
      "Strings must contain well-formed Unicode",
    );
    // Check a lower bound before allocating an encoded copy of a large string.
    ensure(
      value.length <= VALUE_LIMITS.bytes,
      "limit-exceeded",
      "String exceeds its byte limit",
    );
    charge(utf8.encode(JSON.stringify(value)).length);
  }
  function copy(item: unknown, depth: number): Value {
    ensure(
      ++nodes <= VALUE_LIMITS.nodes && depth <= VALUE_LIMITS.depth,
      "limit-exceeded",
      "Value exceeds its structural limits",
    );
    if (item === null || typeof item === "boolean") {
      charge(String(item).length);
      return item;
    }
    if (typeof item === "number") {
      ensure(Number.isFinite(item), "invalid-value", "Numbers must be finite");
      charge(JSON.stringify(item).length);
      return item === 0 ? 0 : item;
    }
    if (typeof item === "string") {
      string(item);
      return item;
    }
    ensure(typeof item === "object", "invalid-value", "Expected JSON data");
    ensure(
      !ancestors.has(item),
      "invalid-value",
      "Values cannot contain cycles",
    );
    const array = Array.isArray(item),
      prototype = Object.getPrototypeOf(item);
    ensure(
      array
        ? prototype === Array.prototype
        : prototype === Object.prototype || prototype === null,
      "invalid-value",
      "Expected a plain object or array",
    );
    const keys = Reflect.ownKeys(item);
    ensure(
      !array || keys.length === item.length + 1,
      "invalid-value",
      "Arrays must be dense and have no extra properties",
    );
    ensure(
      keys.length <= VALUE_LIMITS.nodes + 1,
      "limit-exceeded",
      "Container exceeds its member limit",
    );
    const result: Record<string, Value> | Value[] = array ? [] : {};
    charge(2);
    let count = 0;
    ancestors.add(item);
    for (const key of keys) {
      if (array && key === "length") continue;
      ensure(
        typeof key === "string" && !surrogate.test(key),
        "invalid-value",
        "Invalid member name",
      );
      const property = Object.getOwnPropertyDescriptor(item, key)!;
      ensure(
        property.enumerable && Object.hasOwn(property, "value"),
        "invalid-value",
        "Members must be enumerable data properties",
      );
      if (array) {
        const index = Number(key);
        ensure(
          Number.isInteger(index) &&
            index >= 0 &&
            index < item.length &&
            String(index) === key,
          "invalid-value",
          "Arrays may contain only indexed values",
        );
      } else {
        string(key);
        charge(1);
      }
      if (count++) charge(1);
      Object.defineProperty(result, key, {
        value: copy(property.value, depth + 1),
        enumerable: true,
      });
    }
    ancestors.delete(item);
    return Object.freeze(result);
  }
  return copy(value, 0);
}

export function canonical(value: unknown): string {
  return encode(snapshot(value));
}
export function digest(value: unknown): Digest {
  return digestSnapshot(snapshot(value));
}
