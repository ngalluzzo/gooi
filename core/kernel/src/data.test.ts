import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import canonicalize from "canonicalize";
import { canonical, digest, snapshot, VALUE_LIMITS } from "./data.js";
import { KernelError } from "./errors.js";
import { type Value } from "./types.js";

test("canonical bytes match an independent JCS implementation and SHA-256", () => {
  const cases = [
    null,
    true,
    -0,
    1.5,
    1e-7,
    1e21,
    333333333.3333333,
    { "10": 10, "2": 2, "😀": [null, "雪", '\n\t"\\'], "\ue000": false },
    { nested: { z: 1, a: 2 }, values: [1, 2] },
    { __proto__: null, a: null },
  ];
  for (const value of cases) {
    const expected = canonicalize(value)!;
    expect(canonical(value)).toBe(expected);
    expect(digest(value)).toBe(
      `sha256:${createHash("sha256").update(expected).digest("hex")}`,
    );
  }
  expect(digest(null)).toBe(
    "sha256:74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b",
  );
  expect(canonical({ "2": 2, "10": 10 })).toBe('{"10":10,"2":2}');
});

test("object order is irrelevant; array order and Unicode spelling are meaningful", () => {
  expect(digest({ a: 1, b: 2 })).toBe(digest({ b: 2, a: 1 }));
  expect(digest([1, 2])).not.toBe(digest([2, 1]));
  expect(digest("é")).not.toBe(digest("e\u0301"));
  expect(canonical(-0)).toBe("0");
});

test("snapshots are detached, recursively frozen, and preserve literal member names", () => {
  const input = { nested: [{ name: "before" }], zero: -0 };
  const saved = snapshot(input);
  input.nested[0]!.name = "after";
  expect(saved).toEqual({ nested: [{ name: "before" }], zero: 0 });
  expect(Object.is((saved as { zero: number }).zero, -0)).toBe(false);
  function check(value: Value) {
    if (value && typeof value === "object") {
      expect(Object.isFrozen(value)).toBe(true);
      Object.values(value).forEach(check);
    }
  }
  check(saved);
  const special = JSON.parse('{"__proto__":{"polluted":true},"constructor":1}');
  const copy = snapshot(special);
  expect(Object.hasOwn(copy as object, "__proto__")).toBe(true);
  expect(canonical(copy)).toBe(
    '{"__proto__":{"polluted":true},"constructor":1}',
  );
  expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
});

test("invalid values are refused before any accessor or serialization hook runs", () => {
  let calls = 0;
  const accessor = Object.defineProperty({}, "x", {
    enumerable: true,
    get() {
      calls++;
      return 1;
    },
  });
  const hook = {
    toJSON() {
      calls++;
      return "replacement";
    },
  };
  const inherited = Object.create({
    toJSON() {
      calls++;
      return 1;
    },
  });
  const hidden = Object.defineProperty({}, "x", { value: 1 });
  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  const sparseArray: unknown[] = [];
  sparseArray.length = 2;
  const extra = Object.assign([1], { named: 2 });
  class ArraySubclass extends Array {}
  for (const value of [
    undefined,
    NaN,
    Infinity,
    1n,
    () => 1,
    Symbol(),
    new Date(),
    new Uint8Array(1),
    sparseArray,
    new ArraySubclass(),
    extra,
    hidden,
    accessor,
    hook,
    inherited,
    cycle,
    { x: undefined },
    { [Symbol()]: 1 },
    "\ud800",
    "\udc00",
    { "\ud800": 1 },
  ]) {
    expect(() => snapshot(value)).toThrow(KernelError);
    expect(() => canonical(value)).toThrow(KernelError);
  }
  expect(calls).toBe(0);
});

test("inherited serialization hooks are never called for plain data", () => {
  let calls = 0;
  Object.defineProperty(Object.prototype, "toJSON", {
    configurable: true,
    value() {
      calls++;
      return "changed";
    },
  });
  try {
    expect(canonical({ x: 1 })).toBe('{"x":1}');
    expect(calls).toBe(0);
  } finally {
    Reflect.deleteProperty(Object.prototype, "toJSON");
  }
});

test("shallow freezing cannot hide changes to a caller-owned descendant", () => {
  const value = Object.freeze({ child: { x: 1 } }),
    before = digest(value);
  value.child.x = 2;
  expect(digest(value)).not.toBe(before);
});

test("depth and node limits count expanded values including shared subtrees", () => {
  let nested: unknown = null;
  for (let depth = 0; depth < VALUE_LIMITS.depth; depth++) nested = [nested];
  expect(() => snapshot(nested)).not.toThrow();
  expect(() => snapshot([nested])).toThrow("structural limits");
  const shared = [null, null];
  expect(snapshot([shared, shared])).toEqual([
    [null, null],
    [null, null],
  ]);
  expect(() => snapshot(Array(40_000).fill(shared))).toThrow(
    "structural limits",
  );
});

test("byte budgets account for escaping, UTF-8, keys, and repeated values", () => {
  expect(() => snapshot("a".repeat(VALUE_LIMITS.bytes - 2))).not.toThrow();
  expect(() => snapshot("a".repeat(VALUE_LIMITS.bytes - 1))).toThrow(
    "byte limit",
  );
  for (const value of [
    "雪".repeat(1_500_000),
    "\0".repeat(800_000),
    { ["x".repeat(VALUE_LIMITS.bytes)]: null },
    Array(10).fill("x".repeat(500_000)),
  ]) {
    expect(() => snapshot(value)).toThrow("byte limit");
  }
});
