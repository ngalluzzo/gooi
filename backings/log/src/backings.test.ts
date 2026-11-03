import { describe, expect, test } from "bun:test";
import { appendFileSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { jsonl } from "@gooi/jsonl";
import { sqlite } from "@gooi/sqlite";
import { LOG_APPEND, LOG_READ } from "./index.js";
import { jsonlLog } from "./jsonl.js";
import { sqliteLog } from "./sqlite.js";
import { logLaws } from "./testing.js";

const openJsonl = (directory: string) => jsonlLog(jsonl(directory));
const openSqlite = (file: string) => sqliteLog(sqlite(file));

for (const [name, binding, create] of [
  ["jsonl", "jsonl", openJsonl],
  ["sqlite", "sqlite", openSqlite],
] as const) {
  describe(name, () => {
    for (const law of logLaws(async () => {
      const dir = mkdtempSync(join(tmpdir(), "gooi-log-"));
      const file = join(dir, "log");
      return {
        log: create(file),
        reopen: async () => create(file),
        dispose: async () => rmSync(dir, { recursive: true, force: true }),
      };
    })) test(law.name, law.run);

    test("two separate processes racing to append have one winner", async () => {
      const dir = mkdtempSync(join(tmpdir(), "gooi-log-race-"));
      const file = join(dir, "log");
      const gate = join(dir, "go");
      const worker = join(dir, "worker.ts");
      writeFileSync(worker, `
        import { existsSync, writeFileSync } from "node:fs";
        import { invoke } from ${JSON.stringify(import.meta.resolve("@gooi/exchange"))};
        import { artifact } from ${JSON.stringify(import.meta.resolve("@gooi/kernel/evidence"))};
        import { LOG_APPEND, LogConflict } from ${JSON.stringify(new URL("./index.ts", import.meta.url).href)};
        import { ${binding} as bind } from ${JSON.stringify(import.meta.resolve(`@gooi/${binding}`))};
        import { ${name}Log as lower } from ${JSON.stringify(new URL(`./${name}.ts`, import.meta.url).href)};
        const [id, file, gate] = process.argv.slice(2);
        writeFileSync(gate + id, "");
        while (!existsSync(gate)) await Bun.sleep(5);
        try {
          await invoke(lower(bind(file)).append, artifact(LOG_APPEND, {
            stream: "race", expectedLength: 0, entries: [id, id],
          }));
          console.log(id);
        } catch (error) {
          if (!(error instanceof LogConflict) || error.actual !== 2) throw error;
          console.log("conflict");
        }
      `);
      const writers = ["a", "b"].map((id) =>
        Bun.spawn([process.execPath, worker, id, file, gate], { stdout: "pipe", stderr: "pipe" }),
      );
      try {
        for (let i = 0; i < 500 && !["goa", "gob"].every((marker) => readdirSync(dir).includes(marker)); i++)
          await Bun.sleep(5);
        expect(readdirSync(dir)).toContain("goa");
        expect(readdirSync(dir)).toContain("gob");
        writeFileSync(gate, "");
        const results = await Promise.all(writers.map(async (proc) => {
          const [out, err, exit] = await Promise.all([
            new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
          ]);
          expect(exit, err).toBe(0);
          return out.trim();
        }));
        expect(results).toContain("conflict");
        const winner = results.find((result) => result !== "conflict");
        expect(winner).toBeDefined();
        const result = await invoke(create(file).read, artifact(LOG_READ, { stream: "race" }));
        expect(result.artifact.value).toEqual([winner!, winner!]);
      } finally {
        for (const writer of writers) if (writer.exitCode === null) writer.kill();
        await Promise.all(writers.map((writer) => writer.exited));
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
}

test("JSONL drops a torn final batch and preserves preceding committed entries", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gooi-log-torn-"));
  try {
    const log = openJsonl(dir);
    await invoke(log.append, artifact(LOG_APPEND, { stream: "s", expectedLength: 0, entries: [1, 2] }));
    const file = readdirSync(dir).find((name) => name.endsWith(".jsonl"))!;
    appendFileSync(join(dir, file), '{"stream":"s","entries":[3,');
    const request = artifact(LOG_READ, { stream: "s" });
    expect((await invoke(openJsonl(dir).read, request)).artifact.value).toEqual([1, 2]);
    await invoke(openJsonl(dir).append, artifact(LOG_APPEND, { stream: "s", expectedLength: 2, entries: [4] }));
    expect((await invoke(openJsonl(dir).read, request)).artifact.value).toEqual([1, 2, 4]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SQLite rolls back the whole batch and its length if an insert fails", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gooi-sqlite-rollback-"));
  try {
    const file = join(dir, "log");
    const log = openSqlite(file);
    const append = (expectedLength: number, entries: string[]) =>
      invoke(log.append, artifact(LOG_APPEND, { stream: "s", expectedLength, entries }));
    await append(0, ["first"]);
    sqlite(file)((db) => db.exec(`
      CREATE TRIGGER refuse_third BEFORE INSERT ON entries
      WHEN NEW.position = 2 BEGIN SELECT RAISE(ABORT, 'refuse third entry'); END;
    `));
    await expect(append(1, ["second", "third"])).rejects.toThrow("refuse third entry");
    const request = artifact(LOG_READ, { stream: "s" });
    expect((await invoke(openSqlite(file).read, request)).artifact.value).toEqual(["first"]);
    await append(1, ["replacement"]);
    expect((await invoke(log.read, request)).artifact.value).toEqual(["first", "replacement"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
