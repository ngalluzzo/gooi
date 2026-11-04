import { compile } from "@gooi/commander";
import { commands } from "./commands.js";

export const target = new URL("./nooq.ts", import.meta.url);

/** Lower the layout in commands.ts to the Commander source of nooq.ts. */
export function generate() {
  return compile(commands, {
    name: "nooq",
    description: "nooq's tasks and room, composed from gooi's apps",
    module: "./commands.js",
    export: "commands",
  });
}

if (import.meta.main) await Bun.write(target, (await generate()).source);
