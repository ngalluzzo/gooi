import { dlopen } from "bun:ffi";
import {
  closeSync, ftruncateSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import type { Value } from "@gooi/kernel/types";

function missing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

// The kernel releases flock when the process dies. Keep the lock file in
// place so every process locks the same inode, including after recovery.
let flock: ((fd: number, flags: number) => number) | undefined;
async function lock(fd: number) {
  if (!flock) {
    const libraries: Partial<Record<NodeJS.Platform, string>> = {
      darwin: "/usr/lib/libSystem.B.dylib",
      linux: "libc.so.6",
    };
    const library = libraries[process.platform];
    if (!library) throw new Error("The JSONL file binding requires flock on macOS or glibc Linux");
    flock = dlopen(library, { flock: { args: ["i32", "i32"], returns: "i32" } }).symbols.flock;
  }
  const LOCK_EX = 2, LOCK_NB = 4;
  const deadline = performance.now() + 5_000;
  while (flock(fd, LOCK_EX | LOCK_NB) !== 0) {
    if (performance.now() >= deadline) throw new Error("Could not lock the JSONL directory");
    await Bun.sleep(10);
  }
}

function load(file: string) {
  let bytes: Buffer;
  try {
    bytes = readFileSync(file);
  } catch (error) {
    if (!missing(error)) throw error;
    bytes = Buffer.alloc(0);
  }
  const committedBytes = bytes.lastIndexOf(0x0a) + 1;
  const lines = bytes.subarray(0, committedBytes).toString("utf8").split("\n");
  lines.pop(); // the final separator
  const records = lines.map((line) => JSON.parse(line) as Value);
  return { records, committedBytes, torn: committedBytes !== bytes.length };
}

/** Bind a directory of newline-terminated JSON values. A trailing partial
 * line is ignored on read and trimmed before the next successful append.
 * Operations coordinate through a lock shared by cooperating processes. */
export function jsonl(directory: string) {
  const lockFile = join(directory, ".lock");
  function locked<T>(create: true, empty: undefined, run: () => T): Promise<T>;
  function locked<T>(create: false, empty: T, run: () => T): Promise<T>;
  async function locked<T>(create: boolean, empty: T | undefined, run: () => T): Promise<T | undefined> {
    if (create) mkdirSync(directory, { recursive: true, mode: 0o700 });
    let fd: number;
    try {
      fd = openSync(lockFile, create ? "a" : "r", 0o600);
    } catch (error) {
      if (create || !missing(error)) throw error;
      // An existing directory can contain files created outside this binding.
      try {
        fd = openSync(lockFile, "a", 0o600);
      } catch (createError) {
        if (missing(createError)) return empty;
        throw createError;
      }
    }
    try {
      await lock(fd);
      return run();
    } finally {
      closeSync(fd);
    }
  }

  function filePath(name: string) {
    if (basename(name) !== name || !name.endsWith(".jsonl"))
      throw new Error(`Expected a JSONL filename: ${name}`);
    return join(directory, name);
  }

  return {
    read(name: string): Promise<Value[]> {
      const file = filePath(name);
      return locked(false, [], () => load(file).records);
    },
    scan(select: (name: string) => boolean) {
      return locked(false, [], () => readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl") && select(entry.name))
        .map(({ name }) => ({ name, records: load(filePath(name)).records })));
    },
    /** Choose one value to append while holding the lock. A thrown decision
     * leaves the data untouched. Return the decision's result after syncing. */
    append<T>(name: string, decide: (records: readonly Value[]) => { record: Value; result: T }) {
      const file = filePath(name);
      return locked(true, undefined, () => {
        const { records, torn, committedBytes } = load(file);
        const { record, result } = decide(records);
        const line = JSON.stringify(record) + "\n";
        const fd = openSync(file, "a", 0o600);
        try {
          if (torn) ftruncateSync(fd, committedBytes);
          writeFileSync(fd, line);
          fsyncSync(fd);
        } finally {
          closeSync(fd);
        }
        return result;
      });
    },
  };
}

export type Jsonl = ReturnType<typeof jsonl>;
