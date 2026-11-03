import { fileURLToPath } from "node:url";
import { cli } from "@gooi/cli";
import { fileStore } from "./file.js";
import { slices } from "./index.js";

const root = new URL("../../../", import.meta.url);
const store = fileStore(
  fileURLToPath(new URL(".gooi/slices.json", root)),
  fileURLToPath(new URL("AGENTS.md", root)),
);
process.exitCode = await cli(slices(store), process.argv.slice(2), { name: "gooi" });
