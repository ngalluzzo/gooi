import { fileURLToPath } from "node:url";
import { compile as compileCommands } from "@gooi/commander";
import { compile as compileRoutes } from "@gooi/hono";
import { compile as compileMapping } from "@gooi/react";
import { commands } from "./commands.js";
import { shadcn } from "./design.js";

export const target = new URL("./gooi.ts", import.meta.url);
export const serverTarget = new URL("./server.ts", import.meta.url);
export const designTarget = new URL("./shadcn.tsx", import.meta.url);
const app = new URL("../", import.meta.url);

/** Lower the layout in commands.ts to the Commander source of gooi.ts. */
export function generate() {
  return compileCommands(commands, {
    name: "gooi",
    description: "Gooi's own command: slices and tasks",
    module: "./commands.js",
    export: "commands",
  });
}

/** Lower the shadcn mapping in design.ts to the React renderer in shadcn.tsx. */
export function generateDesign() {
  return compileMapping(shadcn);
}

/** Lower the routes in routes.ts to the Hono source of server.ts. Routes use
 * the generated renderer, so they're imported only once it exists. */
export async function generateServer() {
  const { routes } = await import("./routes.js");
  return compileRoutes(routes, { module: "./routes.js", export: "routes" });
}

/** Tailwind scans the app, including the generated renderer, for classes. */
function buildStyles() {
  const built = Bun.spawnSync(
    [
      fileURLToPath(new URL("node_modules/.bin/tailwindcss", app)),
      "--input=src/shadcn.css",
      "--output=src/shadcn.generated.css",
      "--minify",
    ],
    { cwd: fileURLToPath(app), stdout: "ignore", stderr: "pipe" },
  );
  if (built.exitCode !== 0) throw new Error(`Tailwind failed: ${built.stderr.toString()}`);
}

if (import.meta.main) {
  await Bun.write(target, (await generate()).source);
  await Bun.write(designTarget, (await generateDesign()).source);
  buildStyles();
  await Bun.write(serverTarget, (await generateServer()).source);
}
