import { readFileSync } from "node:fs";
import type { Value } from "@gooi/kernel/types";

/** ACP's own JSON Schema, as published with its SDK: the standard, not a copy. */
export const ACP: { $defs: Record<string, Value> } = JSON.parse(
  readFileSync(
    new URL("../../../schema/v1/schema.json", import.meta.resolve("@agentclientprotocol/sdk")),
    "utf8",
  ),
);
export const acp = (def: string): Value => ({ $defs: ACP.$defs as Value, $ref: `#/$defs/${def}` });
