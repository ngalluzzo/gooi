import { readFileSync } from "node:fs";
import { edge } from "@gooi/exchange";
import { CSS } from "@gooi/hast";

/** The compiled shadcn stylesheet, read on each request so a recompile shows
 * without restarting. `bun run compile` builds it. */
export const stylesheet = edge(
  {
    operation: { input: { id: "urn:gooi:gooi:stylesheet", version: 1 }, output: CSS },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    claim: { id: "urn:gooi:gooi:read-stylesheet", version: 1 },
    scope: "Read the compiled shadcn stylesheet; excludes later rebuilds",
  },
  () => readFileSync(new URL("./shadcn.generated.css", import.meta.url), "utf8"),
);
