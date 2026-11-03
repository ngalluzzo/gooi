import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jsonl } from "./index.js";

test("reads and appends JSON values without a log schema", async () => {
  const directory = mkdtempSync(join(tmpdir(), "gooi-jsonl-"));
  try {
    writeFileSync(join(directory, "values.jsonl"), 'null\n{"color":"blue"}\n');
    expect(await jsonl(directory).read("values.jsonl")).toEqual([null, { color: "blue" }]);
    const result = await jsonl(directory).append("values.jsonl", (records) => ({
      record: [1, 2, 3],
      result: records.length + 1,
    }));
    expect(result).toBe(3);
    expect(await jsonl(directory).read("values.jsonl")).toEqual([null, { color: "blue" }, [1, 2, 3]]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
