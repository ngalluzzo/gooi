import { compile } from "@gooi/commander";
import { commands } from "./commands.js";

export const target = new URL("./gooi.ts", import.meta.url);

/** Lower the layout in commands.ts to the Commander source of gooi.ts. */
export function generate() {
  return compile(commands, {
    name: "gooi",
    description: "Gooi's own command: slices and tasks",
    module: "./commands.js",
    export: "commands",
  });
}

if (import.meta.main) await Bun.write(target, (await generate()).source);
