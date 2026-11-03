import { ensure } from "./assert.js";
import { digestSnapshot } from "./identity.js";
import type { Contract, Digest, Observation, Value } from "./types.js";

type RecordValue = { readonly [key: string]: Value };
export function fields(value: Value, keys: readonly string[]): RecordValue {
  ensure(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "invalid-envelope",
    "Expected a record",
  );
  const actual = Object.keys(value);
  ensure(
    actual.length === keys.length && actual.every((key) => keys.includes(key)),
    "invalid-envelope",
    `Expected fields: ${keys.join(", ")}`,
  );
  return value as RecordValue;
}
export function text(
  value: Value | undefined,
  label: string,
): asserts value is string {
  ensure(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= 1024,
    "invalid-envelope",
    `Invalid ${label}`,
  );
}
function pin(value: Value | undefined): asserts value is Digest {
  ensure(
    typeof value === "string" &&
      value.length === 71 &&
      /^sha256:[a-f0-9]{64}$/u.test(value),
    "invalid-envelope",
    "Expected a SHA-256 digest",
  );
}
export function contract(value: Value): Contract {
  const v = fields(value, ["id", "version"]);
  text(v.id, "contract ID");
  ensure(
    /^[a-z][a-z0-9+.-]*:/iu.test(v.id) &&
      // oxlint-disable-next-line no-control-regex -- Contract IDs explicitly reject ASCII control characters.
      !/[\s\u0000-\u001f\u007f]/u.test(v.id) &&
      !v.id.endsWith(":"),
    "invalid-envelope",
    "Contract IDs must be namespaced",
  );
  ensure(
    typeof v.version === "number" &&
      Number.isSafeInteger(v.version) &&
      v.version > 0,
    "invalid-envelope",
    "Contract versions must be positive safe integers",
  );
  return v as unknown as Contract;
}
export function sameContract(a: Contract, b: Contract): boolean {
  return a.id === b.id && a.version === b.version;
}

export function observationId(
  value: Pick<Observation, "contract" | "key" | "value">,
): Digest {
  return digestSnapshot({
    kind: "gooi.observation/1",
    contract: value.contract as unknown as Value,
    key: value.key,
    value: value.value,
  });
}

export function observation(value: Value): Observation {
  const v = fields(value, ["contract", "key", "value", "id", "artifact"]);
  contract(v.contract!);
  text(v.key, "observation key");
  pin(v.id);
  pin(v.artifact);
  const observed = v as unknown as Observation;
  ensure(
    observed.id === observationId(observed),
    "identity-mismatch",
    "Observation identity differs from its value",
  );
  return observed;
}

/** Internal callers supply admitted JSON; all observation identities are still checked. */
export function boundary(value: Value): string {
  ensure(
    Array.isArray(value) && value.length > 0,
    "invalid-envelope",
    "A boundary must be a nonempty array",
  );
  const keys = value.map((item) => {
    const observed = observation(item);
    return `${observed.id}/${observed.artifact}`;
  });
  ensure(
    new Set(keys).size === keys.length,
    "boundary-mismatch",
    "A boundary cannot repeat an observation from the same artifact",
  );
  return keys.sort().join("\n");
}
