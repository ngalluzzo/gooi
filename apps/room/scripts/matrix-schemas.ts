// Bundle the Matrix event schemas the room uses into one JSON Schema module.
// Run after changing TAG: bun run matrix-schemas (in apps/room).
import { writeFileSync } from "node:fs";
import $RefParser from "@apidevtools/json-schema-ref-parser";

const TAG = "v1.19";
const BASE = `https://raw.githubusercontent.com/matrix-org/matrix-spec/${TAG}/data/`;
const file = (path: string) => BASE + path.replaceAll("$", "%24");

const root = {
  $defs: {
    TextMessage: { $ref: file("event-schemas/schema/m.room.message$m.text.yaml") },
    Member: { $ref: file("event-schemas/schema/m.room.member.yaml") },
    Mentions: { $ref: file("api/client-server/definitions/m.mentions.yaml") },
  },
};

// Inline every reference, then drop the per-file $schema keys: in 2020-12 they
// belong only at a document root. Bun reads the YAML: the bundler's own parser
// rejects m.mentions.yaml's flow mapping.
const bundled = await $RefParser.dereference(structuredClone(root), {
  dereference: { circular: false },
  parse: {
    yaml: {
      order: 1,
      canParse: [".yaml", ".yml"],
      parse: (source: { data: Buffer | string }) => Bun.YAML.parse(source.data.toString()),
    },
  },
});
const strip = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(strip);
  if (node === null || typeof node !== "object") return node;
  return Object.fromEntries(
    Object.entries(node).filter(([key]) => key !== "$schema").map(([key, value]) => [key, strip(value)]),
  );
};

const out = new URL(`../src/matrix-${TAG}.ts`, import.meta.url);
const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", ...(strip(bundled) as object) };
writeFileSync(out, [
  `// Bundled from matrix-org/matrix-spec ${TAG} (Apache-2.0) by apps/room/scripts/matrix-schemas.ts. Do not edit.`,
  "// Room edges check events against it at run time, and json-schema-to-ts derives their types from it.",
  `export const MATRIX = ${JSON.stringify(schema, null, 2)} as const;`,
  "",
].join("\n"));
console.log(`Wrote ${out.pathname}`);
