import { compile as compileCommands } from "@gooi/commander";
import { compile as compileRoutes } from "@gooi/hono";
import { commands } from "./commands.js";
import { routes } from "./routes.js";

export const target = new URL("./gooi.ts", import.meta.url);
export const serverTarget = new URL("./server.ts", import.meta.url);

/** Lower the layout in commands.ts to the Commander source of gooi.ts. */
export function generate() {
  return compileCommands(commands, {
    name: "gooi",
    description: "Gooi's own command: slices and tasks",
    module: "./commands.js",
    export: "commands",
  });
}

/** Lower the routes in routes.ts to the Hono source of server.ts. */
export function generateServer() {
  return compileRoutes(routes, { module: "./routes.js", export: "routes" });
}

if (import.meta.main) {
  await Bun.write(target, (await generate()).source);
  await Bun.write(serverTarget, (await generateServer()).source);
}
