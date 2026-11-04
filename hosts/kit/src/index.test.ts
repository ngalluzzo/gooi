import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { LOG_APPEND } from "@gooi/log";
import { choose, localUser, logs } from "./index.js";

const dir = mkdtempSync(join(tmpdir(), "gooi-host-kit-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("choose names the options when the environment picks one that isn't offered", () => {
  expect(choose("PICK", { a: 1, b: 2 }, "a", {})).toBe(1);
  expect(choose("PICK", { a: 1, b: 2 }, "a", { PICK: "b" })).toBe(2);
  expect(() => choose("PICK", { a: 1 }, "a", { PICK: "toString" })).toThrow('PICK must be one of a; got "toString"');
});

test("GOOI_STORE puts each named log in JSONL files or a SQLite file under the directory", async () => {
  const append = (log: ReturnType<ReturnType<typeof logs>>) =>
    invoke(log.append, artifact(LOG_APPEND, { stream: "s", expectedLength: 0, entries: [1] }));
  await append(logs(dir, {})("rooms"));
  await append(logs(dir, { GOOI_STORE: "sqlite" })("rooms"));
  expect(readdirSync(join(dir, "rooms")).some((name) => name.endsWith(".jsonl"))).toBe(true);
  expect(existsSync(join(dir, "rooms.sqlite"))).toBe(true);
});

test("the local user's name is safe for a Matrix user ID", () => {
  expect(localUser()).toMatch(/^[a-z0-9._=\-/+]+$/u);
});
