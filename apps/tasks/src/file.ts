import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readName } from "./format.js";
import type { Folder } from "./index.js";

/** Task files in `dir`, one `<name>.md` each. A missing folder has no tasks. */
export function fileFolder(dir: string): Folder {
  const file = (name: string) => join(dir, `${readName(name)}.md`);
  return Object.freeze({
    names() {
      try {
        return readdirSync(dir, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
          .map((entry) => entry.name.slice(0, -3))
          .sort();
      } catch (error) {
        if ((error as { code?: string }).code === "ENOENT") return [];
        throw error;
      }
    },
    read(name: string) {
      return readFileSync(file(name), "utf8");
    },
    create(name: string, text: string) {
      mkdirSync(dir, { recursive: true });
      try {
        writeFileSync(file(name), text, { flag: "wx" });
      } catch (error) {
        if ((error as { code?: string }).code === "EEXIST")
          throw new Error(`Task ${name} already exists; choose another name`);
        throw error;
      }
    },
    replace(name: string, expected: string, text: string) {
      const path = file(name);
      if (readFileSync(path, "utf8") !== expected)
        throw new Error(`Task ${name} changed while it was being updated; try again`);
      const temporary = `${path}.${process.pid}.tmp`;
      writeFileSync(temporary, text);
      renameSync(temporary, path);
    },
  });
}
